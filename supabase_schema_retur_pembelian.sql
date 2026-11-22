-- Schema for Retur Pembelian Barang & Retur Pembelian Details in Supabase

CREATE TABLE IF NOT EXISTS public.retur_pembelians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  nama_supplier TEXT NOT NULL,
  no_pembelian TEXT DEFAULT '-',
  no_po TEXT DEFAULT '-',
  no_faktur TEXT DEFAULT '-',
  nilai_retur NUMERIC(15,2) DEFAULT 0,
  keterangan TEXT,
  mata_uang TEXT DEFAULT 'IDR',
  disc NUMERIC(5,2) DEFAULT 0,
  nilai_disc NUMERIC(15,2) DEFAULT 0,
  ppn NUMERIC(5,2) DEFAULT 11,
  nilai_ppn NUMERIC(15,2) DEFAULT 0,
  sts_print TEXT DEFAULT 'Not Yet',
  tgl_print DATE,
  sts_post TEXT DEFAULT 'Posted',
  tgl_post DATE,
  dibuat_oleh TEXT,
  tgl_created DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.retur_pembelians
  ADD COLUMN IF NOT EXISTS no_pembelian TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS no_po TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS no_faktur TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS nilai_disc NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(15,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.retur_pembelian_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retur_id UUID REFERENCES public.retur_pembelians(id) ON DELETE CASCADE,
  no_bukti TEXT,
  no_urut INT DEFAULT 1,
  kode TEXT NOT NULL,
  nama_barang TEXT NOT NULL,
  unit TEXT DEFAULT 'PCS',
  terima NUMERIC(15,2) DEFAULT 0,
  qty NUMERIC(15,2) DEFAULT 1,
  harga NUMERIC(15,2) DEFAULT 0,
  jumlah NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.retur_pembelians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retur_pembelian_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for retur_pembelians" ON public.retur_pembelians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for retur_pembelian_details" ON public.retur_pembelian_details FOR ALL USING (true) WITH CHECK (true);
