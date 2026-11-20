-- Schema for Pembelian Barang & Pembelian Barang Details in Supabase

CREATE TABLE IF NOT EXISTS public.pembelian_barangs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  nama_supplier TEXT NOT NULL,
  no_po TEXT DEFAULT '-',
  no_faktur TEXT NOT NULL,
  keterangan TEXT,
  nilai_pembelian NUMERIC(15,2) DEFAULT 0,
  jth_tmp DATE,
  sts_lunas TEXT DEFAULT 'Belum',
  tgl_lunas DATE,
  sts_post TEXT DEFAULT 'Posted',
  tgl_post DATE,
  dibuat_oleh TEXT,
  tgl_created DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pembelian_barang_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pembelian_id UUID REFERENCES public.pembelian_barangs(id) ON DELETE CASCADE,
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

-- Enable RLS and create policies
ALTER TABLE public.pembelian_barangs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembelian_barang_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for pembelian_barangs" ON public.pembelian_barangs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for pembelian_barang_details" ON public.pembelian_barang_details FOR ALL USING (true) WITH CHECK (true);
