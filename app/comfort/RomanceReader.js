'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ROMANCE_BOOKS } from './romanceBooks';
import { saveHighlightAction } from './actions';

const HIGHLIGHT_COLORS = [
  { id: 'rose', name: 'Crimson Rose', color: '#f43f5e', bg: '#ffe4e6', border: '#fda4af' },
  { id: 'gold', name: 'Warm Gold', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  { id: 'lavender', name: 'Purple Velvet', color: '#9333ea', bg: '#f3e8ff', border: '#d8b4fe' },
  { id: 'mint', name: 'Cozy Mint', color: '#0d9488', bg: '#ccfbf1', border: '#5eead4' },
];

const KINDLE_THEMES = [
  { id: 'paperwhite', name: 'Kindle Paperwhite', bg: '#f7f5f0', text: '#1c1917', cardBg: '#ffffff', border: '#e7e5e4', headerBg: '#ece9e2' },
  { id: 'kindle-dark', name: 'Kindle Dark', bg: '#121212', text: '#e7e5e4', cardBg: '#1c1c1c', border: '#2e2e2e', headerBg: '#181818' },
  { id: 'sepia', name: 'Warm Sepia', bg: '#f4ebd0', text: '#3c2f2f', cardBg: '#faf5e8', border: '#e6d8b8', headerBg: '#ebdcb8' },
  { id: 'velvet', name: 'Dark Velvet', bg: '#170b10', text: '#fce7f3', cardBg: '#28131d', border: '#4a1e34', headerBg: '#210d17' },
];

export default function RomanceReader() {
  const [catalog, setCatalog] = useState(ROMANCE_BOOKS);
  const [selectedMeta, setSelectedMeta] = useState(ROMANCE_BOOKS[0]);
  const [activeBookData, setActiveBookData] = useState(ROMANCE_BOOKS[0]);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [chapterIdx, setChapterIdx] = useState(0);
  const [theme, setTheme] = useState(KINDLE_THEMES[0]); // Default Kindle Paperwhite
  const [fontSize, setFontSize] = useState(19);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTocDropdown, setShowTocDropdown] = useState(false);
  const [showBookshelfModal, setShowBookshelfModal] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  // Selection & Highlight State
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [savedHighlights, setSavedHighlights] = useState([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);

  const contentRef = useRef(null);

  // Fetch normalized book index from /books/index.json if available
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/books/index.json');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCatalog(data);
            setSelectedMeta(data[0]);
          }
        }
      } catch (e) {
        console.warn('Index json not available', e);
      }
    }
    loadCatalog();
  }, []);

  // Fetch selected full book JSON when selectedMeta changes
  useEffect(() => {
    async function loadBookData() {
      if (!selectedMeta || !selectedMeta.id) return;

      const builtIn = ROMANCE_BOOKS.find((b) => b.id === selectedMeta.id);
      if (builtIn && builtIn.chapters) {
        setActiveBookData(builtIn);
        setChapterIdx(0);
        return;
      }

      setLoadingBook(true);
      try {
        const res = await fetch(`/books/${selectedMeta.id}.json`);
        if (res.ok) {
          const fullData = await res.json();
          setActiveBookData(fullData);
        } else {
          setActiveBookData(selectedMeta);
        }
      } catch (e) {
        console.error('Failed to load book data', e);
        setActiveBookData(selectedMeta);
      } finally {
        setLoadingBook(false);
        setChapterIdx(0);
      }
    }
    loadBookData();
  }, [selectedMeta]);

  // Load saved highlights from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('basundi_romance_highlights');
      if (stored) {
        setSavedHighlights(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // PDF Export Handler
  const handleDownloadPdf = async () => {
    if (!activeBookData || !activeBookData.chapters) return;
    setIsDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const title = activeBookData.title || 'Novel';
      const author = activeBookData.author || 'Unknown';

      // Cover Page
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(190, 24, 93);
      const splitTitle = doc.splitTextToSize(title, 160);
      doc.text(splitTitle, 105, 80, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(`By ${author}`, 105, 105, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text(`Kindle & Romance Hub Collection`, 105, 120, { align: 'center' });

      const chapters = activeBookData.chapters || [];
      for (let i = 0; i < chapters.length; i++) {
        doc.addPage();
        const ch = chapters[i];
        let y = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(190, 24, 93);
        doc.text(ch.title || `Chapter ${i + 1}`, 20, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);

        // Strip HTML tags for clean PDF text
        const plainText = (ch.content || '').replace(/<[^>]+>/g, ' ');
        const lines = doc.splitTextToSize(plainText, 170);
        for (const line of lines) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 20, y);
          y += 5.5;
        }
      }

      const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const chaptersList = activeBookData.chapters || [];
  const totalChapters = chaptersList.length || 1;
  const currentChapter = chaptersList[chapterIdx] || chaptersList[0] || { title: 'Chapter 1', content: '<p>Loading chapter content...</p>' };
  const percentageRead = Math.round(((chapterIdx + 1) / totalChapters) * 100);

  // Handle Text Selection inside reader
  const handleTextSelect = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionPopup(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 3) {
      setSelectionPopup(null);
      return;
    }

    if (contentRef.current && contentRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      setSelectionPopup({
        top: Math.max(10, rect.top - 60 + window.scrollY),
        left: Math.max(10, rect.left + rect.width / 2 - 120 + window.scrollX),
      });
    }
  };

  const addHighlight = async (colorObj) => {
    if (!selectedText) return;

    const newHighlight = {
      id: Date.now().toString(),
      bookId: selectedMeta.id,
      bookTitle: selectedMeta.title,
      chapterTitle: currentChapter.title,
      selectedText,
      color: colorObj.id,
      colorBg: colorObj.bg,
      colorText: colorObj.color,
      note: noteInput.trim(),
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const updated = [newHighlight, ...savedHighlights];
    setSavedHighlights(updated);

    try {
      localStorage.setItem('basundi_romance_highlights', JSON.stringify(updated));
      await saveHighlightAction(newHighlight);
    } catch (e) {
      console.error(e);
    }

    setSelectionPopup(null);
    setSelectedText('');
    setNoteInput('');
    setShowNoteField(false);
    if (window.getSelection) window.getSelection().removeAllRanges();
  };

  const isHtmlContent = (str) => {
    return /<[a-z][\s\S]*>/i.test(str);
  };

  return (
    <div
      className="kindle-e-reader"
      style={{
        background: theme.bg,
        color: theme.text,
        minHeight: '85vh',
        borderRadius: '16px',
        border: `1px solid ${theme.border}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Georgia", "Merriweather", "Palatino", serif',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. KINDLE TOP TOOLBAR */}
      <div
        className="kindle-top-bar"
        style={{
          background: theme.headerBg,
          borderBottom: `1px solid ${theme.border}`,
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          zIndex: 10,
        }}
      >
        {/* Book Selector & Library button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowBookshelfModal(true)}
            title="Open Kindle Library Shelf"
            style={{
              background: 'rgba(0,0,0,0.06)',
              border: `1px solid ${theme.border}`,
              color: 'inherit',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📚 Library ({catalog.length})</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </button>

          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px', lineHeight: '1.2' }}>
              {selectedMeta.title}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.75 }}>by {selectedMeta.author}</div>
          </div>
        </div>

        {/* Kindle Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Table of Contents Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTocDropdown((prev) => !prev)}
              style={{
                background: showTocDropdown ? '#f43f5e' : 'rgba(0,0,0,0.06)',
                color: showTocDropdown ? '#fff' : 'inherit',
                border: `1px solid ${theme.border}`,
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📑 Chapters</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>

            {/* TOC Dropdown Menu */}
            {showTocDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '280px',
                  maxHeight: '360px',
                  overflowY: 'auto',
                  background: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  zIndex: 100,
                  padding: '8px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, opacity: 0.7 }}>
                  Table of Contents ({totalChapters} Chapters)
                </div>
                {chaptersList.map((ch, idx) => (
                  <button
                    key={ch.id || idx}
                    onClick={() => {
                      setChapterIdx(idx);
                      setShowTocDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: chapterIdx === idx ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                      color: chapterIdx === idx ? '#f43f5e' : theme.text,
                      fontWeight: chapterIdx === idx ? 'bold' : 'normal',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ch.title}
                    </span>
                    {chapterIdx === idx && <span style={{ fontSize: '12px' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Aa Display Settings Toggle */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDisplaySettings((prev) => !prev)}
              style={{
                background: showDisplaySettings ? '#f43f5e' : 'rgba(0,0,0,0.06)',
                color: showDisplaySettings ? '#fff' : 'inherit',
                border: `1px solid ${theme.border}`,
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              Aa Display
            </button>

            {/* Display Settings Menu */}
            {showDisplaySettings && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '240px',
                  background: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  zIndex: 100,
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', opacity: 0.7 }}>Kindle Theme</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {KINDLE_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          background: t.bg,
                          color: t.text,
                          border: theme.id === t.id ? '2px solid #f43f5e' : `1px solid ${theme.border}`,
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {t.name.split(' ')[1] || t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', opacity: 0.7 }}>Font Size ({fontSize}px)</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setFontSize((s) => Math.max(14, s - 2))} style={{ flex: 1, padding: '4px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none', color: 'inherit', cursor: 'pointer' }}>A-</button>
                    <button onClick={() => setFontSize((s) => Math.min(26, s + 2))} style={{ flex: 1, padding: '4px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none', color: 'inherit', cursor: 'pointer' }}>A+</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf || loadingBook}
            title="Download full book as PDF"
            style={{
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: isDownloadingPdf ? 'wait' : 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{isDownloadingPdf ? '⏳ PDF...' : '📥 Download PDF'}</span>
          </button>

          {/* Saved Quotes Drawer Toggle */}
          <button
            onClick={() => setShowSavedDrawer(true)}
            style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>💖 Quotes</span>
            {savedHighlights.length > 0 && (
              <span style={{ background: '#fff', color: '#e11d48', borderRadius: '50%', padding: '1px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                {savedHighlights.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. KINDLE CANVAS READING SCREEN */}
      <div
        className="kindle-canvas"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '30px 20px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          ref={contentRef}
          onMouseUp={handleTextSelect}
          onTouchEnd={handleTextSelect}
          style={{
            maxWidth: '720px',
            width: '100%',
            fontSize: `${fontSize}px`,
            lineHeight: '1.85',
            color: theme.text,
          }}
        >
          {loadingBook ? (
            <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.7 }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '16px' }}>📖</span>
              <p style={{ fontSize: '16px' }}>Opening Kindle book chapters...</p>
            </div>
          ) : (
            <>
              {/* Kindle Chapter Title Header */}
              <div style={{ marginBottom: '28px', textAlign: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '16px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4em', color: '#f43f5e', fontFamily: 'system-ui, sans-serif' }}>
                  {currentChapter.title}
                </h2>
                <div style={{ fontSize: '0.7em', opacity: 0.65 }}>
                  {selectedMeta.title} • Chapter {chapterIdx + 1} of {totalChapters}
                </div>
              </div>

              {/* Chapter Content View */}
              {isHtmlContent(currentChapter.content) ? (
                <div
                  className="kindle-formatted-html"
                  dangerouslySetInnerHTML={{ __html: currentChapter.content }}
                  style={{
                    wordBreak: 'break-word',
                  }}
                />
              ) : (
                <div>
                  {(currentChapter.content || '').split('\n\n').map((para, idx) => (
                    <p key={idx} style={{ marginBottom: '1.4em', textIndent: idx > 0 ? '1.5em' : '0' }}>
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. KINDLE BOTTOM PROGRESS STATUS BAR */}
      <div
        className="kindle-bottom-bar"
        style={{
          background: theme.headerBg,
          borderTop: `1px solid ${theme.border}`,
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          zIndex: 10,
        }}
      >
        <button
          disabled={chapterIdx === 0}
          onClick={() => setChapterIdx((prev) => Math.max(0, prev - 1))}
          style={{
            background: 'none',
            border: `1px solid ${theme.border}`,
            color: theme.text,
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: chapterIdx === 0 ? 'not-allowed' : 'pointer',
            opacity: chapterIdx === 0 ? 0.4 : 1,
            fontWeight: 'bold',
          }}
        >
          ‹ Prev Chapter
        </button>

        <div style={{ textAlign: 'center', opacity: 0.85 }}>
          <div style={{ fontWeight: '600' }}>
            Chapter {chapterIdx + 1} of {totalChapters} • {percentageRead}% Read
          </div>
        </div>

        <button
          disabled={chapterIdx === totalChapters - 1}
          onClick={() => setChapterIdx((prev) => Math.min(totalChapters - 1, prev + 1))}
          style={{
            background: chapterIdx === totalChapters - 1 ? 'none' : '#f43f5e',
            border: chapterIdx === totalChapters - 1 ? `1px solid ${theme.border}` : 'none',
            color: chapterIdx === totalChapters - 1 ? theme.text : '#fff',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: chapterIdx === totalChapters - 1 ? 'not-allowed' : 'pointer',
            opacity: chapterIdx === totalChapters - 1 ? 0.4 : 1,
            fontWeight: 'bold',
          }}
        >
          Next Chapter ›
        </button>
      </div>

      {/* KINDLE BOTTOM EDGE VISUAL PROGRESS BAR */}
      <div
        style={{
          height: '4px',
          width: '100%',
          background: 'rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentageRead}%`,
            background: '#f43f5e',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* BOOKSHELF LIBRARY MODAL */}
      {showBookshelfModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '540px',
              width: '100%',
              background: theme.cardBg,
              color: theme.text,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${theme.border}`,
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f43f5e' }}>📚 Kindle Bookshelf ({catalog.length} Available)</h3>
              <button onClick={() => setShowBookshelfModal(false)} style={{ background: 'none', border: 'none', color: theme.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {catalog.map((book) => {
                const isSelected = book.id === selectedMeta.id;
                return (
                  <button
                    key={book.id}
                    onClick={() => {
                      setSelectedMeta(book);
                      setShowBookshelfModal(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      background: isSelected ? (book.coverGradient || 'linear-gradient(135deg, #18181b, #27272a)') : 'rgba(0,0,0,0.04)',
                      color: isSelected ? '#fff' : theme.text,
                      border: isSelected ? '2px solid #f43f5e' : `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{book.title}</div>
                      <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>by {book.author} • {book.totalChapters || 1} Chapters</div>
                    </div>
                    {isSelected && <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Reading Now</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING HIGHLIGHT POPUP */}
      {selectionPopup && (
        <div
          style={{
            position: 'absolute',
            top: `${selectionPopup.top}px`,
            left: `${selectionPopup.left}px`,
            zIndex: 999,
            background: '#18181b',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '14px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            border: '1px solid #3f3f46',
            minWidth: '240px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#a1a1aa', display: 'flex', justifyContent: 'space-between' }}>
            <span>Highlight Quote</span>
            <button onClick={() => setSelectionPopup(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => addHighlight(c)}
                title={c.name}
                style={{
                  background: c.color,
                  border: 'none',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* SAVED HIGHLIGHTS DRAWER */}
      {showSavedDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '450px',
              background: theme.cardBg,
              color: theme.text,
              height: '100%',
              padding: '24px',
              overflowY: 'auto',
              boxShadow: '-5px 0 25px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#f43f5e' }}>💖 Saved Quotes</h3>
              <button onClick={() => setShowSavedDrawer(false)} style={{ background: 'none', border: 'none', color: theme.text, fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>

            {savedHighlights.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '60px', opacity: 0.7 }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>📖</span>
                <p>No quotes saved yet!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {savedHighlights.map((item) => {
                  const colorObj = HIGHLIGHT_COLORS.find((c) => c.id === item.color) || HIGHLIGHT_COLORS[0];
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: theme.bg,
                        borderLeft: `4px solid ${colorObj.color}`,
                        padding: '14px',
                        borderRadius: '10px',
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <div style={{ fontSize: '11px', color: colorObj.color, fontWeight: 'bold', marginBottom: '4px' }}>
                        {item.bookTitle} • {item.chapterTitle}
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '14px', fontStyle: 'italic', background: colorObj.bg, color: '#000', padding: '8px 12px', borderRadius: '6px' }}>
                        "{item.selectedText}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
