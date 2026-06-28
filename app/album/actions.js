'use server';

import { getAdminSupabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Returns the logged-in person's "author" name, or null if not logged in.
async function getAuthor() {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;
  if (!role) return null;
  return role === 'admin' ? 'saket' : 'grishma';
}

// Upload a photo to the album. The image arrives already turned into the
// instax print format (baked client-side), so we just store the blob.
export async function addAlbumPhotoFromUser(formData) {
  const author = await getAuthor();
  if (!author) throw new Error('Not logged in');

  const file = formData.get('file');
  const caption = formData.get('caption') || null;
  const photo_date = formData.get('photo_date') || null;

  if (!file || file.size === 0) throw new Error('No photo provided');

  const db = getAdminSupabase();

  const fileExt = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await db
    .storage
    .from('album-photos')
    .upload(fileName, file, { upsert: false, contentType: file.type || 'image/jpeg' });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = db
    .storage
    .from('album-photos')
    .getPublicUrl(fileName);

  const { error: dbError } = await db.from('album_photos').insert([
    { image_url: publicUrl, caption, photo_date, category: 'monthly', author },
  ]);

  if (dbError) throw new Error(`Database error: ${dbError.message}`);

  revalidatePath('/album');
  revalidatePath('/home');
  return { success: true };
}

// Add a comment to a photo.
export async function addComment(photoId, text) {
  const author = await getAuthor();
  if (!author) throw new Error('Not logged in');
  if (!text || !text.trim()) throw new Error('Empty comment');

  const db = getAdminSupabase();
  const { error } = await db.from('album_comments').insert([
    { photo_id: photoId, author, comment_text: text.trim() },
  ]);

  if (error) throw new Error(error.message);

  revalidatePath('/album');
  return { success: true };
}

// Toggle an emoji reaction on a photo (add if missing, remove if present).
export async function toggleReaction(photoId, emoji) {
  const author = await getAuthor();
  if (!author) throw new Error('Not logged in');

  const db = getAdminSupabase();

  const { data: existing } = await db
    .from('album_reactions')
    .select('id')
    .eq('photo_id', photoId)
    .eq('author', author)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from('album_reactions').delete().eq('id', existing.id);
    if (error) throw new Error(error.message);
    revalidatePath('/album');
    return { success: true, active: false };
  }

  const { error } = await db.from('album_reactions').insert([
    { photo_id: photoId, author, emoji },
  ]);
  if (error) throw new Error(error.message);

  revalidatePath('/album');
  return { success: true, active: true };
}
