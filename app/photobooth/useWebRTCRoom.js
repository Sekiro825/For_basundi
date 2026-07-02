'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const ROOM_NAME = 'photobooth-room';

// Free STUN + a free public TURN fallback (Open Relay Project). STUN alone
// fails often enough on real-world home/mobile networks with symmetric NAT
// that the TURN fallback meaningfully improves connection odds for a
// two-person call across different networks, at no cost.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// Manages presence + WebRTC signaling for the fixed two-person photo booth
// room over a single Supabase Realtime channel. `role` is 'admin' or 'user'
// (from the site's existing login cookie) and doubles as the WebRTC
// initiator rule: admin always creates the offer once presence shows the
// other role online, so no separate election/locking is needed.
export function useWebRTCRoom(role, localStream) {
  const [peerOnline, setPeerOnline] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [remoteStream, setRemoteStream] = useState(null);

  const channelRef = useRef(null);
  const pcRef = useRef(null);
  const sessionHandlerRef = useRef(null);

  const peerRole = role === 'admin' ? 'user' : 'admin';

  const sendEvent = useCallback((event, payload) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const onSessionEvent = useCallback((handler) => {
    sessionHandlerRef.current = handler;
  }, []);

  useEffect(() => {
    if (!role || !localStream) return undefined;

    const channel = supabase.channel(ROOM_NAME, {
      config: { presence: { key: role }, broadcast: { self: true } },
    });
    channelRef.current = channel;

    const ensurePeerConnection = () => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.onicecandidate = (e) => {
        if (e.candidate) sendEvent('webrtc-ice', { candidate: e.candidate, from: role });
      };
      pc.ontrack = (e) => setRemoteStream(e.streams[0]);
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        if (pc.connectionState === 'failed' && pc.restartIce) {
          pc.restartIce();
        }
      };
      pcRef.current = pc;
      return pc;
    };

    const startCall = async () => {
      const pc = ensurePeerConnection();
      setConnectionState('connecting');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendEvent('webrtc-offer', { sdp: offer, from: role });
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = Boolean(state[peerRole]?.length);
        setPeerOnline(online);
        if (online && role === 'admin' && !pcRef.current) {
          startCall().catch((err) => console.error('Failed to start call:', err));
        }
      })
      .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
        if (payload.from === role) return;
        const pc = ensurePeerConnection();
        setConnectionState('connecting');
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendEvent('webrtc-answer', { sdp: answer, from: role });
      })
      .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
        if (payload.from === role || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(payload.sdp);
      })
      .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
        if (payload.from === role || !pcRef.current) return;
        try {
          await pcRef.current.addIceCandidate(payload.candidate);
        } catch {
          // Candidates that arrive before the remote description is set are safe to drop.
        }
      })
      .on('broadcast', { event: 'session' }, ({ payload }) => {
        sessionHandlerRef.current?.(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online: true });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      pcRef.current?.close();
      pcRef.current = null;
      channelRef.current = null;
      setConnectionState('idle');
      setRemoteStream(null);
      setPeerOnline(false);
    };
  }, [role, localStream, peerRole, sendEvent]);

  return { peerOnline, connectionState, remoteStream, sendEvent, onSessionEvent };
}
