import { supabase } from '../lib/supabase';
import { getUserRole } from '../actions';
import AlbumClient from './AlbumClient';
import './album.css';

export const revalidate = 0; // Disable static caching

export default async function AlbumPage() {
  const [{ data: photos }, { data: comments }, { data: reactions }, userRole] =
    await Promise.all([
      supabase.from('album_photos').select('*').order('created_at', { ascending: false }),
      supabase.from('album_comments').select('*').order('created_at', { ascending: true }),
      supabase.from('album_reactions').select('*'),
      getUserRole(),
    ]);

  // Keep the outdoor selfie first (original behaviour)
  let sortedPhotos = [];
  if (photos) {
    const idx = photos.findIndex(
      (p) =>
        (p.caption && p.caption.toLowerCase().includes('outdoor selfie')) ||
        (p.image_url && p.image_url.includes('Snapchat-922464268'))
    );
    if (idx > -1) {
      const [first] = photos.splice(idx, 1);
      sortedPhotos = [first, ...photos];
    } else {
      sortedPhotos = [...photos];
    }
  }

  // Group comments + reactions by photo for easy lookup on the client
  const commentsByPhoto = {};
  (comments || []).forEach((c) => {
    (commentsByPhoto[c.photo_id] ||= []).push(c);
  });
  const reactionsByPhoto = {};
  (reactions || []).forEach((r) => {
    (reactionsByPhoto[r.photo_id] ||= []).push(r);
  });

  return (
    <AlbumClient
      photos={sortedPhotos}
      commentsByPhoto={commentsByPhoto}
      reactionsByPhoto={reactionsByPhoto}
      userRole={userRole}
    />
  );
}
