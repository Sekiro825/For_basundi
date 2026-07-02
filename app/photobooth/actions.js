'use server';

import { getAdminSupabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Either logged-in person (admin or user) may save a strip — unlike the
// /admin panel, the booth is meant to be used by both of you.
const verifyLoggedIn = async () => {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;
  if (role !== 'admin' && role !== 'user') {
    throw new Error('Unauthorized');
  }
  return role;
};

export async function savePhotoboothStrip(formData) {
  await verifyLoggedIn();

  const file = formData.get('file');
  const shotCount = Number(formData.get('shot_count')) || 4;
  let poses = [];
  try {
    poses = JSON.parse(formData.get('poses') || '[]');
  } catch {
    poses = [];
  }

  if (!file || file.size === 0) throw new Error('No strip image provided');

  const supabase = getAdminSupabase();

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

  const { error: uploadError } = await supabase
    .storage
    .from('photobooth-strips')
    .upload(fileName, file, { upsert: false, contentType: 'image/jpeg' });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase
    .storage
    .from('photobooth-strips')
    .getPublicUrl(fileName);

  const { error: dbError } = await supabase.from('photobooth_prints').insert([
    { image_url: publicUrl, shot_count: shotCount, poses },
  ]);

  if (dbError) throw new Error(`Database error: ${dbError.message}`);

  revalidatePath('/photobooth');
  return { success: true, url: publicUrl };
}
