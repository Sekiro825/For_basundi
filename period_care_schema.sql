-- ============================================================
-- PERIOD CARE & DELIVERIES SCHEMA
-- Run this in your Supabase SQL Editor to enable online sync for
-- Basundi's Period Care Delivery requests and saved Romance Highlights!
-- ============================================================

-- Table for delivery requests submitted by Basundi
CREATE TABLE IF NOT EXISTS public.period_care_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL,
  phone TEXT,
  cravings JSONB, -- Array of selected items like ["Momos", "French Fries", "Chocolates"]
  note TEXT,
  status TEXT DEFAULT 'pending_delivery', -- 'pending_delivery', 'preparing', 'delivered'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for saved novel highlights and quotes
CREATE TABLE IF NOT EXISTS public.romance_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  color TEXT DEFAULT 'rose',
  note TEXT,
  chapter_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.period_care_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.romance_highlights ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert policies
CREATE POLICY "Public read period_care_deliveries"
  ON public.period_care_deliveries FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public insert period_care_deliveries"
  ON public.period_care_deliveries FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public read romance_highlights"
  ON public.romance_highlights FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public insert romance_highlights"
  ON public.romance_highlights FOR INSERT TO anon, authenticated WITH CHECK (true);
