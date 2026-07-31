'use client';

import { useState, useTransition } from 'react';
import { addLoveNote, addAlbumPhoto } from './actions';
import { revealNextGift, setGiftReveal } from '../surprises/actions';
import { surpriseGifts } from '../surprises/surpriseData';
import './admin.css';

export default function AdminClient({ surpriseStatuses, periodDeliveries = [] }) {
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevealPending, startRevealTransition] = useTransition();

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ message: 'Saving note...', type: 'loading' });

    try {
      const formData = new FormData(e.target);
      await addLoveNote(formData);
      setStatus({ message: 'Note added successfully! 💌', type: 'success' });
      e.target.reset();
    } catch (err) {
      setStatus({ message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ message: 'Uploading photo...', type: 'loading' });

    try {
      const formData = new FormData(e.target);
      await addAlbumPhoto(formData);
      setStatus({ message: 'Photo added to album! 📸', type: 'success' });
      e.target.reset();
    } catch (err) {
      setStatus({ message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const revealNext = () => {
    startRevealTransition(async () => {
      try {
        const result = await revealNextGift();
        setStatus({
          message: result.done ? 'All surprise gifts are already revealed 👑' : 'Next surprise revealed! ✨',
          type: 'success',
        });
      } catch (err) {
        setStatus({ message: err.message, type: 'error' });
      }
    });
  };

  const toggleGift = (giftKey, isRevealed) => {
    startRevealTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('giftKey', giftKey);
        formData.append('isRevealed', String(isRevealed));
        await setGiftReveal(formData);
        setStatus({ message: isRevealed ? 'Gift revealed ✨' : 'Gift hidden again 🔒', type: 'success' });
      } catch (err) {
        setStatus({ message: err.message, type: 'error' });
      }
    });
  };

  return (
    <div className="admin-page fade-in">
      <h1 className="admin-header">Admin Panel</h1>
      <p className="admin-sub">For Saket's eyes only 👀</p>

      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* PERIOD CARE DELIVERIES SECTION */}
      <div style={{ background: 'linear-gradient(135deg, #2b0b18, #4a102a)', border: '2px solid #f43f5e', borderRadius: '18px', padding: '24px', marginBottom: '28px', color: '#fff' }}>
        <h2 style={{ margin: '0 0 8px', color: '#fda4af', fontSize: '22px' }}>🛵 Basundi's Period Care Delivery Requests</h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#fecdd3' }}>
          When Basundi enters her address & food cravings in the Comfort Hub, her orders appear here!
        </p>

        {periodDeliveries.length === 0 ? (
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', fontSize: '13px', opacity: 0.8 }}>
            No delivery requests submitted yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {periodDeliveries.map((item) => (
              <div key={item.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #f43f5e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fda4af', fontWeight: 'bold' }}>
                  <span>📍 Delivery Address</span>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', margin: '6px 0', color: '#fff' }}>
                  {item.address}
                </div>
                {item.cravings && (
                  <div style={{ fontSize: '13px', color: '#fecdd3', margin: '4px 0' }}>
                    <strong>Cravings:</strong> {Array.isArray(item.cravings) ? item.cravings.join(', ') : JSON.stringify(item.cravings)}
                  </div>
                )}
                {item.phone && (
                  <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    <strong>Phone:</strong> {item.phone}
                  </div>
                )}
                {item.note && (
                  <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#fda4af', marginTop: '4px' }}>
                    "{item.note}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="admin-surprise-card">
        <div>
          <p className="admin-eyebrow">Surprise Quest</p>
          <h2>Reveal her gifts one by one</h2>
          <p>She can see a gift only after you reveal it, then she has to win its mini game to unlock the message.</p>
        </div>
        <button type="button" className="admin-btn admin-reveal-next" disabled={isRevealPending} onClick={revealNext}>
          {isRevealPending ? 'Revealing...' : 'Reveal Next Gift'}
        </button>
        <div className="surprise-admin-list">
          {surpriseGifts.map((gift) => {
            const row = surpriseStatuses[gift.key] || {};
            return (
              <div className="surprise-admin-row" key={gift.key}>
                <span>{row.is_claimed ? '✅' : row.is_revealed ? gift.emoji : '🔒'}</span>
                <div>
                  <strong>Gift {gift.number}: {gift.title}</strong>
                  <small>{row.is_claimed ? 'Won and opened' : row.is_revealed ? 'Visible to her' : 'Hidden'}</small>
                </div>
                <button
                  type="button"
                  disabled={isRevealPending}
                  onClick={() => toggleGift(gift.key, !row.is_revealed)}
                >
                  {row.is_revealed ? 'Hide' : 'Reveal'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-forms">
        <div className="admin-card">
          <h2>Write a Love Note 💌</h2>
          <form onSubmit={handleNoteSubmit} encType="multipart/form-data">
            <div className="form-group">
              <label>Title</label>
              <input type="text" name="title" required className="admin-input" placeholder="e.g. Thinking of you" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date (Optional)</label>
                <input type="date" name="note_date" className="admin-input" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" className="admin-input">
                  <option value="monthly">Every Month</option>
                  <option value="special_occasion">Special Occasion</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mood</label>
                <select name="mood" className="admin-input">
                  <option value="love">Love ❤️</option>
                  <option value="grateful">Grateful 🙏</option>
                  <option value="missing">Missing You 🥺</option>
                  <option value="excited">Excited ✨</option>
                  <option value="funny">Funny 😂</option>
                </select>
              </div>

              <div className="form-group">
                <label>Flower Emoji</label>
                <input type="text" name="flower_emoji" defaultValue="🌹" className="admin-input" />
              </div>
            </div>

            <div className="form-group">
              <label>Content</label>
              <textarea name="content" required rows="6" className="admin-input" placeholder="Write your heart out..."></textarea>
            </div>

            <div className="form-group">
              <label>Attach Photo (Optional)</label>
              <input type="file" name="file" accept="image/*" className="admin-input" />
            </div>

            <button type="submit" disabled={isSubmitting} className="admin-btn">
              Save Note
            </button>
          </form>
        </div>

        <div className="admin-card">
          <h2>Add to Album 📸</h2>
          <form onSubmit={handlePhotoSubmit}>
            <div className="form-group">
              <label>Photo File</label>
              <input type="file" name="file" accept="image/*" required className="admin-input" />
            </div>

            <div className="form-group">
              <label>Caption</label>
              <input type="text" name="caption" className="admin-input" placeholder="e.g. Our first date at..." />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date taken (Optional)</label>
                <input type="date" name="photo_date" className="admin-input" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" className="admin-input">
                  <option value="monthly">Every Month</option>
                  <option value="special_occasion">Special Occasion</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="admin-btn">
              Upload Photo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
