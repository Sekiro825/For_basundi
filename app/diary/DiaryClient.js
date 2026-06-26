'use client';

import React, { useState, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { addReply, addDiaryEntry } from './actions';

const Page = React.forwardRef((props, ref) => {
  return (
    <div className={`book-page ${props.isCover ? 'book-cover' : ''}`} ref={ref}>
      <div className="page-content">
        {props.children}
      </div>
    </div>
  );
});

Page.displayName = 'Page';

const ReplySection = ({ noteId, onReply, replyingTo, setReplyingTo, isSubmitting }) => {
  const [replyText, setReplyText] = useState('');

  const isReplying = replyingTo === noteId;

  if (!isReplying) {
    return (
      <button
        className="diary-reply-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setReplyingTo(noteId);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        ✍️ Write your thoughts...
      </button>
    );
  }

  return (
    <div 
      className="diary-reply-form fade-in"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Write your thoughts..."
        className="diary-reply-textarea"
        rows="3"
      />
      <div className="reply-form-actions">
        <button
          onClick={async () => {
            if (!replyText.trim()) return;
            await onReply(noteId, replyText);
            setReplyText('');
          }}
          disabled={isSubmitting || !replyText.trim()}
          className="reply-save-btn"
        >
          {isSubmitting ? 'Saving...' : 'Save 💌'}
        </button>
        <button
          onClick={() => {
            setReplyingTo(null);
            setReplyText('');
          }}
          className="reply-cancel-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default function DiaryClient({ notes, userRole }) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [status, setStatus] = useState('');
  
  const bookRef = useRef();

  const handleReply = async (noteId, replyText) => {
    setIsSubmitting(true);
    try {
      await addReply(noteId, replyText);
      setReplyingTo(null);
      setStatus('Reply saved! 💌');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Failed to save reply 😢');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewEntry = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.target);
      await addDiaryEntry(formData);
      e.target.reset();
      setShowWriteForm(false);
      setStatus('Entry added! ✨');
      setTimeout(() => setStatus(''), 3000);
      
      // Optionally turn to the new page if it was added at the front
      if (bookRef.current) {
         bookRef.current.pageFlip().turnToPage(1);
      }
    } catch (err) {
      setStatus('Failed to save entry 😢');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGrishma = userRole === 'user';
  const isSaket = userRole === 'admin';
  const authorLabel = isSaket ? 'Saket' : 'Grishma';

  return (
    <>
      {/* Status Toast */}
      {status && (
        <div className="diary-toast diary-fade-in">
          {status}
        </div>
      )}

      {/* Book Actions Container */}
      <div className="book-actions">
        <button
          className="book-action-btn"
          onClick={() => {
            setShowWriteForm(!showWriteForm);
            if (bookRef.current && !showWriteForm) {
              // Go back to the cover or page 1 where form will be visible
              bookRef.current.pageFlip().turnToPage(1);
            }
          }}
        >
          {showWriteForm ? 'Cancel ✕' : `Write something, ${authorLabel} ✍️`}
        </button>
      </div>

      <div className="book-wrapper">
        <button 
          className="side-nav-btn prev-btn" 
          onClick={() => bookRef.current.pageFlip().flipPrev()}
          aria-label="Previous Page"
        >
          &#10094;
        </button>

        <div className="book-container">
          <HTMLFlipBook 
            width={600} 
            height={750} 
            size="stretch"
            minWidth={315}
            maxWidth={1000}
            minHeight={400}
            maxHeight={1000}
            maxShadowOpacity={0.5}
            showCover={true}
            mobileScrollSupport={true}
            usePortrait={false}
            className="diary-flipbook"
            ref={bookRef}
            useMouseEvents={false}
          >
          {/* Front Cover */}
          <Page isCover={true}>
            <div className="cover-inner">
              <h1 className="cover-title">Our Story</h1>
              <p className="cover-subtitle">Saket & Grishma</p>
              <div className="cover-decoration">❦</div>
            </div>
          </Page>

          {/* Form Page (Inside Cover) */}
          <Page>
            {showWriteForm ? (
              <div className="diary-new-entry-card fade-in">
                <h3 className="new-entry-label">
                  {isSaket ? '💙 Saket writing...' : '💗 Grishma writing...'}
                </h3>
                <form 
                  onSubmit={handleNewEntry} 
                  className="new-entry-form"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="Title of your entry..."
                    className="diary-input"
                  />
                  <textarea
                    name="content"
                    required
                    rows="7"
                    placeholder="Write your heart out..."
                    className="diary-textarea"
                  ></textarea>
                  <div className="new-entry-row">
                    <input
                      type="date"
                      name="note_date"
                      className="diary-input diary-input-sm"
                    />
                    <select name="mood" className="diary-input diary-input-sm">
                      <option value="love">Love ❤️</option>
                      <option value="grateful">Grateful 🙏</option>
                      <option value="missing">Missing You 🥺</option>
                      <option value="excited">Excited ✨</option>
                      <option value="funny">Funny 😂</option>
                    </select>
                    <input
                      type="text"
                      name="flower_emoji"
                      defaultValue={isSaket ? '🌹' : '🌸'}
                      className="diary-input diary-input-emoji"
                      title="Pick a flower"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="diary-submit-btn"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Entry 💖'}
                  </button>
                </form>
              </div>
            ) : (
                <div className="intro-page">
                    <h2>Dedication</h2>
                    <p>Every page here belongs to us. Flip through our memories and write down new ones.</p>
                </div>
            )}
          </Page>

          {/* Diary Entries Pages */}
          {notes.length === 0 ? (
            <Page>
              <div className="diary-empty">
                <p>The pages are waiting to be filled with your love story...</p>
              </div>
            </Page>
          ) : (
            notes.map((note, index) => {
              const isSaketsNote = !note.author || note.author === 'saket';
              const isGrishmasNote = note.author === 'grishma';
              
              // We could spread very long notes across multiple pages, but for now we put 1 note = 1 page
              // We'll use CSS to handle overflow with scrolling if necessary

              return (
                <Page key={note.id}>
                  <div className={`diary-card ${isSaketsNote ? 'diary-card-saket' : 'diary-card-grishma'}`}>
                    <div className={`diary-author-badge ${isSaketsNote ? 'badge-saket' : 'badge-grishma'}`}>
                      {isSaketsNote ? '💙 Saket' : '💗 Grishma'}
                    </div>

                    <div className="diary-date">
                      <span className="diary-flower">{note.flower_emoji}</span>
                      {new Date(note.note_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>

                    <h2 className="diary-entry-title">{note.title}</h2>
                    <div
                      className="diary-entry-body"
                      dangerouslySetInnerHTML={{
                        __html: note.content.replace(/\n/g, '<br/>'),
                      }}
                    />

                    {note.note_images && note.note_images.length > 0 && (
                      <div className="diary-images-container">
                        {note.note_images.map((img) => (
                          <img key={img.id} src={img.image_url} alt={note.title} className="diary-img" />
                        ))}
                      </div>
                    )}

                    <div className="diary-mood-tag">
                      {note.mood === 'love' && '❤️ Love'}
                      {note.mood === 'grateful' && '🙏 Grateful'}
                      {note.mood === 'missing' && '🥺 Missing You'}
                      {note.mood === 'excited' && '✨ Excited'}
                      {note.mood === 'funny' && '😂 Funny'}
                      {!note.mood && '❤️ Love'}
                    </div>

                    {note.grishma_reply && (
                      <div className="diary-reply">
                        <div className="reply-header">
                          <span className="reply-label">💗 Grishma's reply</span>
                          {note.grishma_reply_date && (
                            <span className="reply-date">
                              {new Date(note.grishma_reply_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        <p className="reply-text">{note.grishma_reply}</p>
                      </div>
                    )}

                    {isSaketsNote && !note.grishma_reply && (
                      <div className="reply-section">
                        <ReplySection
                          noteId={note.id}
                          onReply={handleReply}
                          replyingTo={replyingTo}
                          setReplyingTo={setReplyingTo}
                          isSubmitting={isSubmitting}
                        />
                      </div>
                    )}
                  </div>
                </Page>
              );
            })
          )}

          {/* Back Cover - Make sure we have an even number of pages overall so flipbook works optimally */}
          <Page isCover={true}>
            <div className="cover-inner back-cover">
              <div className="cover-decoration">❦</div>
              <p>To be continued...</p>
            </div>
          </Page>

        </HTMLFlipBook>
        </div>

        <button 
          className="side-nav-btn next-btn" 
          onClick={() => bookRef.current.pageFlip().flipNext()}
          aria-label="Next Page"
        >
          &#10095;
        </button>
      </div>
    </>
  );
}

