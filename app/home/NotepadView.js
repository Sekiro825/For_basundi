'use client';

import { useState } from 'react';

export default function NotepadView({ initialEntries }) {
  const [activeTab, setActiveTab] = useState('monthly');

  // Filter entries. If category is missing in older entries, default to 'monthly'
  const filteredEntries = initialEntries.filter(entry => {
    const category = entry.category || 'monthly';
    return category === activeTab;
  });

  return (
    <div className="notebook-container">
      {/* Tabs */}
      <div className="notebook-tabs">
        <button 
          className={`notebook-tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          Every Month
        </button>
        <button 
          className={`notebook-tab ${activeTab === 'special_occasion' ? 'active' : ''}`}
          onClick={() => setActiveTab('special_occasion')}
        >
          Special Occasions
        </button>
      </div>

      <div className="notebook-binding">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="spiral-hole">
            <div className="spiral-ring"></div>
          </div>
        ))}
      </div>

      <div className="notebook-paper">
        <div className="notebook-header">
          <h1 className="notebook-title">
            {activeTab === 'monthly' ? 'Our Monthly Chapters' : 'The Special Occasions'}
          </h1>
        </div>
        
        <div className="notebook-content">
          {filteredEntries.length === 0 ? (
            <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>
              The pages are waiting to be filled...
            </p>
          ) : (
            filteredEntries.map((entry, index) => (
              <div key={`${entry.type}-${entry.id}`} className="notebook-entry">
                <div className="entry-header">
                  {(entry.type === 'note' || entry.photo_date) && (
                    <span className="entry-date">
                      {entry.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {entry.type === 'note' && <span className="entry-flower">{entry.flower_emoji}</span>}
                </div>
                
                {entry.type === 'note' ? (
                  <>
                    <h2 className="entry-title">{entry.title}</h2>
                    <div 
                      className="entry-body" 
                      dangerouslySetInnerHTML={{ __html: entry.content.replace(/\n/g, '<br/>') }} 
                    />
                    {entry.note_images && entry.note_images.map((img) => (
                      <img key={img.id} src={img.image_url} alt={entry.title} className="entry-photo" />
                    ))}
                  </>
                ) : (
                  <>
                    {entry.caption && <h2 className="entry-title">{entry.caption}</h2>}
                    <img src={entry.image_url} alt={entry.caption || 'Memory'} className="entry-photo" />
                    {entry.caption && <p className="entry-photo-caption">{entry.caption}</p>}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
