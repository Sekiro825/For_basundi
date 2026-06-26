import { supabase } from '../lib/supabase';
import './notes.css';

export const revalidate = 0; // Disable static caching so you always see new notes

export default async function NotesPage() {
  const { data: notes } = await supabase
    .from('love_notes')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="notes-page">
      <h1 className="notes-header">Love Notes 💌</h1>
      <p className="notes-sub">A collection of thoughts, just for you, Grishma.</p>
      
      <div className="notes-timeline">
        {notes?.length === 0 && (
          <p className="no-notes">No notes yet... but they are coming soon!</p>
        )}
        
        {notes?.map((note) => (
          <div key={note.id} className="note-card slide-up">
            <div className="note-date">
              {new Date(note.note_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="note-content-box">
              <div className="note-flower">{note.flower_emoji}</div>
              <h2 className="note-title">{note.title}</h2>
              <div className="note-body" dangerouslySetInnerHTML={{ __html: note.content.replace(/\n/g, '<br/>') }} />
              <div className="note-mood">Mood: {note.mood}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
