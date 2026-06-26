-- Love notes table
CREATE TABLE IF NOT EXISTS public.love_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT DEFAULT 'love',
  flower_emoji TEXT DEFAULT '🌹',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Album photos table
CREATE TABLE IF NOT EXISTS public.album_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  caption TEXT,
  photo_date DATE,
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

-- Public read access (she can view everything)
CREATE POLICY "Public read notes" ON public.love_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read album" ON public.album_photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read note images" ON public.note_images FOR SELECT TO anon, authenticated USING (true);

-- Insert a welcome note
INSERT INTO public.love_notes (title, content, note_date, mood, flower_emoji)
VALUES (
  'A New Beginning ✨', 
  'Hey Grishma, welcome to our special place. I wanted to make something that could hold all our memories, notes, and photos over time. This is for you! 💖',
  CURRENT_DATE,
  'excited',
  '🌻'
);
