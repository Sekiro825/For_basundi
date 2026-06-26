'use client';

import { useState } from 'react';
import { addLoveNote, addAlbumPhoto } from './actions';
import './admin.css';

export default function AdminPage() {
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="admin-page fade-in">
      <h1 className="admin-header">Admin Panel</h1>
      <p className="admin-sub">For Saket's eyes only 👀</p>

      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      <div className="admin-forms">
        {/* ADD NOTE FORM */}
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

        {/* ADD PHOTO FORM */}
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
