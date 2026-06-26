import { supabase } from '../lib/supabase';
import Image from 'next/image';
import './album.css';

export const revalidate = 0; // Disable static caching

export default async function AlbumPage() {
  const { data: photos } = await supabase
    .from('album_photos')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="album-page">
      <h1 className="album-header">The Album 📸</h1>
      <p className="album-sub">A growing collection of our favorite moments, Grishma.</p>

      <div className="album-grid">
        {(!photos || photos.length === 0) && (
          <p className="no-photos">No photos yet... time to make some memories!</p>
        )}

        {photos?.map((photo, index) => {
          // create a scrapbook scattered effect
          const tilt = (index % 2 === 0 ? 1 : -1) * ((index % 5) + 1);
          return (
            <div 
              key={photo.id} 
              className="polaroid-card slide-up"
              style={{ '--tilt': `${tilt}deg`, animationDelay: `${(index % 5) * 0.1}s` }}
            >
              <div className="polaroid-tape"></div>
              <div className="polaroid-img-wrap">
                <Image 
                  src={photo.image_url} 
                  alt={photo.caption || 'A memory of us'} 
                  width={400} 
                  height={400} 
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
              <div className="polaroid-text">
                {photo.caption && <p className="polaroid-caption">{photo.caption}</p>}
                {photo.photo_date && (
                  <span className="polaroid-date">
                    {new Date(photo.photo_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
