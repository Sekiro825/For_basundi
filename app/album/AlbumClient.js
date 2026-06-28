'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { makeInstax } from './instax';
import { addAlbumPhotoFromUser, addComment, toggleReaction } from './actions';

const REACTION_EMOJIS = ['❤️', '😍', '🥺', '😂', '🔥', '🌸', '💋'];

function authorName(role) {
  if (role === 'admin') return 'saket';
  if (role === 'user') return 'grishma';
  return null;
}
function prettyName(author) {
  return author === 'saket' ? 'Saket' : 'Grishma';
}

// ---------- Bunting + fairy lights ("patakas") ----------
function Patakas() {
  const flagColors = ['#F48FB1', '#D4AF37', '#C2185B', '#F8BBD0', '#FFD54F', '#EC407A'];
  const flags = Array.from({ length: 14 });
  const bulbs = Array.from({ length: 26 });
  return (
    <div className="patakas" aria-hidden="true">
      <div className="fairy-string">
        {bulbs.map((_, i) => (
          <span
            key={i}
            className="fairy-bulb"
            style={{ '--i': i, animationDelay: `${(i % 5) * 0.3}s` }}
          />
        ))}
      </div>
      <div className="bunting">
        {flags.map((_, i) => (
          <span
            key={i}
            className="bunting-flag"
            style={{
              color: flagColors[i % flagColors.length],
              animationDelay: `${(i % 6) * 0.25}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- A single instax print pinned to the wall ----------
function PrintCard({ photo, index, comments, reactions, userRole, refresh }) {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);

  const me = authorName(userRole);
  const tilt = (index % 2 === 0 ? 1 : -1) * (((index % 4) + 1) * 0.9);

  // group reactions by emoji
  const grouped = useMemo(() => {
    const g = {};
    (reactions || []).forEach((r) => {
      (g[r.emoji] ||= []).push(r.author);
    });
    return g;
  }, [reactions]);

  const handleReact = async (emoji) => {
    if (!me || busy) return;
    setBusy(true);
    try {
      await toggleReaction(photo.id, emoji);
      refresh();
    } catch (e) {
      // silent
    } finally {
      setBusy(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !me || busy) return;
    setBusy(true);
    try {
      await addComment(photo.id, commentText);
      setCommentText('');
      refresh();
    } catch (e) {
      // silent
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`journey-stop ${index % 2 === 0 ? 'stop-left' : 'stop-right'}`}
      style={{ animationDelay: `${(index % 6) * 0.08}s` }}
    >
      <span className="journey-node" />
      <div className="instax-pin">
        <span className="clothespin" />
        <div className="instax-print" style={{ '--tilt': `${tilt}deg` }}>
          {/* The image is already baked into instax format on upload, but
              older photos still get a clean white frame here. */}
          <div className="instax-photo">
            <img src={photo.image_url} alt={photo.caption || 'A memory of us'} />
          </div>
          {photo.caption && <p className="instax-caption">{photo.caption}</p>}
          <div className="instax-meta">
            <span className={`who who-${photo.author || 'saket'}`}>
              {photo.author === 'grishma' ? '💗 Grishma' : '💙 Saket'}
            </span>
            {photo.photo_date && (
              <span className="when">
                {new Date(photo.photo_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* reaction summary */}
          {Object.keys(grouped).length > 0 && (
            <div className="reaction-summary">
              {Object.entries(grouped).map(([emoji, who]) => (
                <span
                  key={emoji}
                  className="reaction-chip"
                  title={who.map(prettyName).join(' & ')}
                >
                  {emoji} {who.length > 1 ? who.length : ''}
                </span>
              ))}
            </div>
          )}

          {me && (
            <div className="reaction-bar">
              {REACTION_EMOJIS.map((emoji) => {
                const active = (grouped[emoji] || []).includes(me);
                return (
                  <button
                    key={emoji}
                    className={`react-btn ${active ? 'react-active' : ''}`}
                    onClick={() => handleReact(emoji)}
                    disabled={busy}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          <button className="comment-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide notes' : `💬 ${comments?.length || 0} note${(comments?.length || 0) === 1 ? '' : 's'}`}
          </button>

          {open && (
            <div className="comment-area fade-in">
              <div className="comment-list">
                {(comments || []).length === 0 && (
                  <p className="comment-empty">Be the first to leave a little note 💕</p>
                )}
                {(comments || []).map((c) => (
                  <div key={c.id} className={`comment comment-${c.author}`}>
                    <span className="comment-author">
                      {c.author === 'grishma' ? '💗 Grishma' : '💙 Saket'}
                    </span>
                    <span className="comment-text">{c.comment_text}</span>
                  </div>
                ))}
              </div>
              {me && (
                <form className="comment-form" onSubmit={handleComment}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={`Write a note, ${prettyName(me)}...`}
                    className="comment-input"
                  />
                  <button type="submit" disabled={busy || !commentText.trim()} className="comment-send">
                    Send 💌
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Upload station ----------
function UploadStation({ userRole, refresh }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef();
  const blobRef = useRef(null);

  const me = authorName(userRole);
  if (!me) return null;

  const rebake = async (f, cap, d) => {
    if (!f) return;
    setProcessing(true);
    try {
      const { blob, previewUrl } = await makeInstax(f, cap, d);
      blobRef.current = blob;
      setPreview(previewUrl);
    } catch {
      setStatus('Could not process that image 😢');
    } finally {
      setProcessing(false);
    }
  };

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStatus('');
    await rebake(f, caption, date);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!blobRef.current || uploading) return;
    setUploading(true);
    setStatus('');
    try {
      // make sure the latest caption/date are baked in
      await rebake(file, caption, date);
      const fd = new FormData();
      fd.append('file', blobRef.current, `instax_${Date.now()}.jpg`);
      fd.append('caption', caption);
      fd.append('photo_date', date);
      await addAlbumPhotoFromUser(fd);
      setStatus('Pinned to our wall! 📸✨');
      setFile(null);
      setCaption('');
      setDate('');
      setPreview(null);
      blobRef.current = null;
      if (fileRef.current) fileRef.current.value = '';
      refresh();
      setTimeout(() => setStatus(''), 3500);
    } catch (err) {
      setStatus(err.message || 'Upload failed 😢');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-station">
      <div className="upload-paper">
        <h3 className="upload-title">Add to our journey ✨</h3>
        <p className="upload-sub">
          Drop a photo, {prettyName(me)} — it turns into an instax print automatically.
        </p>
        <form className="upload-form" onSubmit={onSubmit}>
          <label className="file-drop">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPick}
              hidden
            />
            {preview ? (
              <img src={preview} alt="instax preview" className="upload-preview" />
            ) : (
              <span className="file-drop-hint">
                📷 Tap to choose a photo
              </span>
            )}
            {processing && <span className="processing-badge">developing…</span>}
          </label>

          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => file && rebake(file, caption, date)}
            placeholder="A little caption…"
            className="upload-input"
            maxLength={60}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={() => file && rebake(file, caption, date)}
            className="upload-input"
          />
          <button
            type="submit"
            disabled={!preview || uploading || processing}
            className="upload-btn"
          >
            {uploading ? 'Pinning…' : 'Pin it to the wall 📌'}
          </button>
          {status && <p className="upload-status">{status}</p>}
        </form>
      </div>
    </div>
  );
}

export default function AlbumClient({ photos, commentsByPhoto, reactionsByPhoto, userRole }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="album-page journey-wall">
      <Patakas />

      <header className="journey-header">
        <h1 className="journey-title">Our Journey</h1>
        <p className="journey-sub">
          A wall of all our little moments, Grishma 💗 — every photo, every note.
        </p>
      </header>

      <UploadStation userRole={userRole} refresh={refresh} />

      <div className="journey-path">
        {(!photos || photos.length === 0) && (
          <p className="no-photos">No photos yet… time to make some memories!</p>
        )}
        {photos?.map((photo, index) => (
          <PrintCard
            key={photo.id}
            photo={photo}
            index={index}
            comments={commentsByPhoto[photo.id]}
            reactions={reactionsByPhoto[photo.id]}
            userRole={userRole}
            refresh={refresh}
          />
        ))}
        <div className="journey-end">
          <span className="journey-end-heart">❦</span>
          <p>to be continued…</p>
        </div>
      </div>
    </div>
  );
}
