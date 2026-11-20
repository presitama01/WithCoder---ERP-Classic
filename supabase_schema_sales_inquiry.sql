-- Schema for Sales Inquiries in Supabase

CREATE TABLE IF NOT EXISTS public.sales_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal_si DATE NOT NULL,
  tanggal_do DATE,
  nama_customer TEXT NOT NULL,
  nama_sales TEXT,
  qty NUMERIC(15,2) DEFAULT 0,
  keterangan TEXT,
  follow TEXT DEFAULT 'Follow',
  tgl_follow DATE,
  no_sq TEXT,
  tgl_sq DATE,
  dibuat_oleh TEXT,
  tgl_created DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sales_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for sales_inquiries" ON public.sales_inquiries FOR ALL USING (true) WITH CHECK (true);
