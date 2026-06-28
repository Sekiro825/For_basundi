-- ============================================================
-- ALBUM "JOURNEY WALL" UPGRADE
-- Run this in the Supabase SQL editor.
-- Adds: author tracking on photos, comments, and emoji reactions.
-- ============================================================

-- 1. Track who uploaded each photo (saket / grishma)
ALTER TABLE public.album_photos
  ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'saket';

-- 2. Comments on photos (both of us can comment on each other's photos)
CREATE TABLE IF NOT EXISTS public.album_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.album_photos(id) ON DELETE CASCADE,
  author TEXT NOT NULL,                -- 'saket' or 'grishma'
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_comments_photo
  ON public.album_comments(photo_id);

-- 3. Emoji reactions on photos
CREATE TABLE IF NOT EXISTS public.album_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.album_photos(id) ON DELETE CASCADE,
  author TEXT NOT NULL,                -- 'saket' or 'grishma'
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (photo_id, author, emoji)     -- one of each emoji per person per photo
);

CREATE INDEX IF NOT EXISTS idx_album_reactions_photo
  ON public.album_reactions(photo_id);

-- 4. RLS
ALTER TABLE public.album_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read album comments"
  ON public.album_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read album reactions"
  ON public.album_reactions FOR SELECT TO anon, authenticated USING (true);

-- Writes go through the service-role key in server actions, so anon
-- insert policies are optional. Added here for completeness/flexibility.
CREATE POLICY "Allow insert album comments"
  ON public.album_comments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert album reactions"
  ON public.album_reactions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow delete album reactions"
  ON public.album_reactions FOR DELETE TO anon, authenticated USING (true);
