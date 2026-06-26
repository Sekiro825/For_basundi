'use server';

import { getAdminSupabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Helper to check role
const verifyAdmin = async () => {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;
  if (role !== 'admin') {
    throw new Error('Unauthorized');
  }
};

export async function addLoveNote(formData) {
  await verifyAdmin();

  const title = formData.get('title');
  const content = formData.get('content');
  const mood = formData.get('mood') || 'love';
  const flower_emoji = formData.get('flower_emoji') || '🌹';
  const note_date = formData.get('note_date') || new Date().toISOString().split('T')[0];
  const category = formData.get('category') || 'monthly';

  const supabase = getAdminSupabase();
  
  // Insert the note first and select its ID
  const { data: noteData, error } = await supabase.from('love_notes').insert([
    { title, content, mood, flower_emoji, note_date, category }
  ]).select('id').single();

  if (error) throw new Error(error.message);

  // Check if a photo file was attached
  const file = formData.get('file');
  if (file && file.size > 0) {
    // 1. Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase
      .storage
      .from('note-images')
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 2. Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('note-images')
      .getPublicUrl(fileName);

    // 3. Insert into note_images table
    const { error: dbError } = await supabase.from('note_images').insert([
      { 
        note_id: noteData.id, 
        image_url: publicUrl 
      }
    ]);

    if (dbError) throw new Error(`Database error saving image: ${dbError.message}`);
  }
  
  revalidatePath('/home');
  revalidatePath('/notes');
  revalidatePath('/diary');
  return { success: true };
}

export async function addAlbumPhoto(formData) {
  await verifyAdmin();

  const file = formData.get('file');
  const caption = formData.get('caption');
  const photo_date = formData.get('photo_date');
  const category = formData.get('category') || 'monthly';

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
      photo_date: photo_date || null,
      category
    }
  ]);

  if (dbError) throw new Error(`Database error: ${dbError.message}`);

  revalidatePath('/home');
  revalidatePath('/album');
  return { success: true };
}
