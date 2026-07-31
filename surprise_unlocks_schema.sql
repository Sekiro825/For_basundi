-- ============================================================
-- SURPRISE QUEST UNLOCKS
-- Run this in the Supabase SQL editor before using /surprises.
-- Admin reveal state is stored here so gifts unlock across devices.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.surprise_unlocks (
  gift_key TEXT PRIMARY KEY,
  is_revealed BOOLEAN NOT NULL DEFAULT false,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  revealed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.surprise_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read surprise unlocks"
  ON public.surprise_unlocks FOR SELECT TO anon, authenticated USING (true);

-- Writes are intentionally handled by Next.js server actions with the service role key.
-- Do not add anon/authenticated write policies unless you want visitors to reveal gifts.

INSERT INTO public.surprise_unlocks (gift_key, is_revealed, is_claimed)
VALUES
  ('sugar-rush', false, false),
  ('tetris-stack', false, false),
  ('card-castle', false, false),
  ('pacman-love', false, false),
  ('snakey-love', false, false),
  ('slide-it', false, false),
  ('traffic-dodge', false, false),
  ('pipe-dream', false, false),
  ('maze-runner', false, false),
  ('boss-level', false, false)
ON CONFLICT (gift_key) DO NOTHING;
