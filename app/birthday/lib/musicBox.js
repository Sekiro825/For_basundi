// A tiny Web Audio "music box". Everything is synthesised, so there are no
// audio files to host and nothing to license ("Happy Birthday to You" has
// been public domain since 2016).

const HZ = {
  F2: 87.31, G2: 98.0, A2: 110.0, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0,
  G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, C6: 1046.5,
  E6: 1318.51, G6: 1567.98,
};

// [melody note, beats, lyric syllable, bass notes at this beat]
export function buildSong(nameSyllables = ['Grish', 'ma']) {
  const [n1, n2 = ''] = nameSyllables;
  const raw = [
    ['G4', 0.75, 'Hap'], ['G4', 0.25, 'py'], ['A4', 1, 'birth', ['C3', 'G3']], ['G4', 1, 'day'], ['C5', 1, 'to'], ['B4', 2, 'you', ['G2', 'D3']],
    ['G4', 0.75, 'Hap'], ['G4', 0.25, 'py'], ['A4', 1, 'birth', ['G2', 'F3']], ['G4', 1, 'day'], ['D5', 1, 'to'], ['C5', 2, 'you', ['C3', 'G3']],
    ['G4', 0.75, 'Hap'], ['G4', 0.25, 'py'], ['G5', 1, 'birth', ['C3', 'E3']], ['E5', 1, 'day'], ['C5', 1, 'dear'], ['B4', 1, n1, ['F2', 'C3']], ['A4', 1.75, n2],
    ['F5', 0.75, 'Hap'], ['F5', 0.25, 'py'], ['E5', 1, 'birth', ['C3', 'G3']], ['C5', 1, 'day'], ['D5', 1, 'to', ['G2', 'D3']], ['C5', 3, 'you', ['C3', 'G3']],
  ];
  return raw.map(([note, beats, syllable, bass]) => ({ note, beats, syllable, bass: bass || null }));
}

// Line breaks for the karaoke display (indices into the song array).
export const SONG_LINES = [
  [0, 6],
  [6, 12],
  [12, 19],
  [19, 25],
];

function pluck(ctx, dest, freq, t, gain = 0.2, decay = 1.8) {
  // A music-box tine: bright attack, upper partials die faster than the fundamental.
  const partials = [
    [1, 1, 'sine', 1],
    [2.004, 0.34, 'sine', 0.55],
    [3.012, 0.12, 'triangle', 0.35],
    [5.03, 0.04, 'sine', 0.2],
  ];
  for (const [mult, amp, type, life] of partials) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const end = t + decay * life;
    osc.type = type;
    osc.frequency.value = freq * mult;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain * amp, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(end + 0.05);
  }
}

export function createMusicBox() {
  const state = { ctx: null, master: null, input: null, muted: false, volume: 0.6, session: null };

  function ensure() {
    if (typeof window === 'undefined') return null;
    if (!state.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = state.muted ? 0 : state.volume;
      master.connect(ctx.destination);

      // Dry signal plus a soft filtered echo, which reads as "room" on a music box.
      const input = ctx.createGain();
      const delay = ctx.createDelay(1);
      const feedback = ctx.createGain();
      const tone = ctx.createBiquadFilter();
      const wet = ctx.createGain();
      delay.delayTime.value = 0.29;
      feedback.gain.value = 0.32;
      tone.type = 'lowpass';
      tone.frequency.value = 2400;
      wet.gain.value = 0.38;
      input.connect(master);
      input.connect(delay);
      delay.connect(tone);
      tone.connect(feedback);
      feedback.connect(delay);
      tone.connect(wet);
      wet.connect(master);

      Object.assign(state, { ctx, master, input });
    }
    if (state.ctx.state === 'suspended') state.ctx.resume().catch(() => {});
    return state.ctx;
  }

  function stop(fade = 0.3) {
    const s = state.session;
    if (!s) return;
    s.stopped = true;
    s.timers.forEach(clearTimeout);
    if (s.out && state.ctx) {
      const g = s.out.gain;
      const now = state.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + fade);
      const out = s.out;
      setTimeout(() => out.disconnect(), fade * 1000 + 120);
    }
    state.session = null;
  }

  // Plays the song. Lyric callbacks fire even when muted or when Web Audio is
  // unavailable, so on-screen karaoke always stays in time.
  function play({ song, tempo = 100, gain = 1, loop = false, gap = 2, onNote, onEnd } = {}) {
    stop(0.15);
    const session = { timers: [], out: null, stopped: false };
    state.session = session;
    const beat = 60 / tempo;

    const run = () => {
      if (session.stopped) return;
      const ctx = ensure();
      const lead = 0.08;
      let start = 0;
      if (ctx) {
        const previous = session.out;
        session.out = ctx.createGain();
        session.out.gain.value = gain;
        session.out.connect(state.input);
        if (previous) setTimeout(() => previous.disconnect(), 3000);
        start = ctx.currentTime + lead;
      }

      let beats = 0;
      song.forEach((n, i) => {
        const at = beats * beat;
        if (ctx) {
          pluck(ctx, session.out, HZ[n.note] * 2, start + at, 0.2);
          if (n.bass) n.bass.forEach((b) => pluck(ctx, session.out, HZ[b] * 2, start + at, 0.08, 2.4));
        }
        session.timers.push(setTimeout(() => !session.stopped && onNote?.(i, n), (at + lead) * 1000));
        beats += n.beats;
      });

      const total = beats * beat;
      session.timers.push(
        setTimeout(() => {
          if (session.stopped) return;
          if (loop) {
            session.timers = [];
            run();
          } else {
            onEnd?.();
          }
        }, (total + (loop ? gap : 0.6)) * 1000)
      );
    };

    run();
  }

  function sparkle() {
    const ctx = ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    ['C6', 'E6', 'G6', 'C6'].forEach((n, i) => pluck(ctx, state.input, HZ[n] * (i === 3 ? 2 : 1), t + i * 0.07, 0.09, 1.2));
  }

  function poof() {
    const ctx = ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.3);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const env = ctx.createGain();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.8;
    env.gain.value = 0.18;
    src.buffer = buffer;
    src.connect(band);
    band.connect(env);
    env.connect(state.input);
    src.start();
  }

  function setMuted(muted) {
    state.muted = muted;
    if (!state.ctx) return;
    const g = state.master.gain;
    const now = state.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(muted ? 0 : state.volume, now + 0.25);
  }

  function dispose() {
    stop(0.05);
    if (state.ctx && state.ctx.state !== 'closed') state.ctx.close().catch(() => {});
    state.ctx = null;
  }

  return { unlock: ensure, play, stop, sparkle, poof, setMuted, dispose, get muted() { return state.muted; } };
}
