'use server';

import { getAdminSupabase } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Get current user role
async function getRole() {
  const cookieStore = await cookies();
  return cookieStore.get('user_role')?.value || null;
}

// Grishma replies to a note
export async function addReply(noteId, replyText) {
  const role = await getRole();
  if (!role) throw new Error('Not logged in');

  const db = getAdminSupabase();
  const { error } = await db
    .from('love_notes')
    .update({
      grishma_reply: replyText,
      grishma_reply_date: new Date().toISOString(),
    })
    .eq('id', noteId);

  if (error) throw new Error(error.message);

  revalidatePath('/diary');
  revalidatePath('/home');
  return { success: true };
}

// Grishma writes her own diary entry
export async function addDiaryEntry(formData) {
  const role = await getRole();
  if (!role) throw new Error('Not logged in');

  const title = formData.get('title');
  const content = formData.get('content');
  const mood = formData.get('mood') || 'love';
  const flower_emoji = formData.get('flower_emoji') || '🌸';
  const note_date = formData.get('note_date') || new Date().toISOString().split('T')[0];
  const author = role === 'admin' ? 'saket' : 'grishma';

  const db = getAdminSupabase();
  const { error } = await db.from('love_notes').insert([
    {
      title,
      content,
      mood,
      flower_emoji,
      note_date,
      category: 'monthly',
      author,
    },
  ]);

  if (error) throw new Error(error.message);

  revalidatePath('/diary');
  revalidatePath('/home');
  revalidatePath('/notes');
  return { success: true };
}
