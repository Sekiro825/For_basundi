-- Love notes table
CREATE TABLE IF NOT EXISTS public.love_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT DEFAULT 'love',
  flower_emoji TEXT DEFAULT '🌹',
  category TEXT DEFAULT 'monthly', -- 'monthly' or 'special_occasion'
  author TEXT DEFAULT 'saket', -- 'saket' or 'grishma'
  grishma_reply TEXT, -- Grishma's response to the note
  grishma_reply_date TIMESTAMPTZ, -- When Grishma replied
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Album photos table
CREATE TABLE IF NOT EXISTS public.album_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  caption TEXT,
  photo_date DATE,
  category TEXT DEFAULT 'monthly', -- 'monthly' or 'special_occasion'
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note images (photos attached to specific notes)
CREATE TABLE IF NOT EXISTS public.note_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.love_notes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.love_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_images ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read notes" ON public.love_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read album" ON public.album_photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read note images" ON public.note_images FOR SELECT TO anon, authenticated USING (true);

-- Allow insert & update on notes (for shared diary)
CREATE POLICY "Allow insert notes" ON public.love_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update grishma reply" ON public.love_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Migration commands if tables already exist:
-- ALTER TABLE public.love_notes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'monthly';
-- ALTER TABLE public.love_notes ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'saket';
-- ALTER TABLE public.love_notes ADD COLUMN IF NOT EXISTS grishma_reply TEXT;
-- ALTER TABLE public.love_notes ADD COLUMN IF NOT EXISTS grishma_reply_date TIMESTAMPTZ;
-- ALTER TABLE public.album_photos ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'monthly';
