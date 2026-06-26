import { supabase } from '../lib/supabase';
import NotepadView from './NotepadView';

export const revalidate = 0;

export default async function HomePage() {
  // Fetch notes
  const { data: notes } = await supabase
    .from('love_notes')
    .select('*, note_images(*)')
    .order('note_date', { ascending: false });

  // Fetch photos
  const { data: photos } = await supabase
    .from('album_photos')
    .select('*')
    .order('photo_date', { ascending: false });

  // Combine and sort
  const allEntries = [];

  if (notes) {
    notes.forEach(n => {
      allEntries.push({
        ...n,
        type: 'note',
        date: new Date(n.note_date)
      });
    });
  }

  if (photos) {
    photos.forEach(p => {
      allEntries.push({
        ...p,
        type: 'photo',
        date: new Date(p.photo_date)
      });
    });
  }

  // Sort by date descending
  allEntries.sort((a, b) => b.date - a.date);

  return (
    <div className="notebook-wrapper fade-in">
      <NotepadView initialEntries={allEntries} />
    </div>
  );
}
