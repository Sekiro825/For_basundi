'use server';

import { getAdminSupabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Helper to check password
const verifyPassword = (password) => {
  if (password !== ADMIN_PASSWORD) {
    throw new Error('Invalid admin password');
  }
};

export async function addLoveNote(formData) {
  const password = formData.get('password');
  verifyPassword(password);

  const title = formData.get('title');
  const content = formData.get('content');
  const mood = formData.get('mood') || 'love';
  const flower_emoji = formData.get('flower_emoji') || '🌹';
  const note_date = formData.get('note_date') || new Date().toISOString().split('T')[0];

  const supabase = getAdminSupabase();
  const { error } = await supabase.from('love_notes').insert([
    { title, content, mood, flower_emoji, note_date }
  ]);

  if (error) throw new Error(error.message);
  
  revalidatePath('/notes');
  return { success: true };
}

export async function addAlbumPhoto(formData) {
  const password = formData.get('password');
  verifyPassword(password);

  const file = formData.get('file');
  const caption = formData.get('caption');
  const photo_date = formData.get('photo_date');

  if (!file || file.size === 0) throw new Error('No photo provided');

  const supabase = getAdminSupabase();
  
  // 1. Upload the file to storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('album-photos')
    .upload(fileName, file, { upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 2. Get the public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from('album-photos')
    .getPublicUrl(fileName);

  // 3. Insert into database
  const { error: dbError } = await supabase.from('album_photos').insert([
    { 
      image_url: publicUrl, 
      caption, 
      photo_date: photo_date || null 
    }
  ]);

  if (dbError) throw new Error(`Database error: ${dbError.message}`);

  revalidatePath('/album');
  return { success: true };
}
