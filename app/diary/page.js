import { supabase } from '../lib/supabase';
import { cookies } from 'next/headers';
import DiaryClient from './DiaryClient';
import './diary.css';

export const revalidate = 0;

export default async function DiaryPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('user_role')?.value;

  const { data: notes } = await supabase
    .from('love_notes')
    .select('*, note_images(*)')
    .order('note_date', { ascending: false });

  return (
    <div className="diary-page">
      <div className="diary-hero">
        <h1 className="diary-title">Our Shared Diary 📖</h1>
        <p className="diary-subtitle">
          A place where both our hearts write — together, always.
        </p>
      </div>

      <DiaryClient notes={notes || []} userRole={userRole} />
    </div>
  );
}
