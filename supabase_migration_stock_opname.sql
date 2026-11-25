-- ============================================================================
-- MIGRATION SQL MODUL STOCK OPNAME & PENYESUAIAN STOK (KOREKSI FISIK)
-- Idempotent: Aman dijalankan berulang kali di Supabase SQL Editor
-- ============================================================================

-- 1. Header & Detail Stock Opname
CREATE TABLE IF NOT EXISTS public.stock_opnames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  lokasi_stock TEXT DEFAULT '01 - OFFICE',
  keterangan TEXT DEFAULT '',
  sts_post TEXT DEFAULT 'Posting',
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  tgl_created DATE DEFAULT CURRENT_DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_opnames
  ADD COLUMN IF NOT EXISTS lokasi_stock TEXT DEFAULT '01 - OFFICE',
  ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sts_post TEXT DEFAULT 'Posting',
  ADD COLUMN IF NOT EXISTS dibuat_oleh TEXT DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS tgl_created DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS diupdate_oleh TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS tgl_update DATE;

CREATE TABLE IF NOT EXISTS public.stock_opname_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID NOT NULL REFERENCES public.stock_opnames(id) ON DELETE CASCADE,
  no_bukti TEXT NOT NULL DEFAULT '',
  no_urut INTEGER DEFAULT 1,
  kode TEXT NOT NULL DEFAULT '',
  nama_barang TEXT NOT NULL DEFAULT '',
  unit TEXT DEFAULT 'PCS',
  stock_sistem NUMERIC(18,2) DEFAULT 0,
  stock_fisik NUMERIC(18,2) DEFAULT 0,
  selisih NUMERIC(18,2) DEFAULT 0,
  hpp NUMERIC(18,2) DEFAULT 0,
  total_selisih NUMERIC(18,2) DEFAULT 0,
  keterangan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_opname_details
  ADD COLUMN IF NOT EXISTS no_bukti TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS no_urut INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS stock_sistem NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_fisik NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selisih NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hpp NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_selisih NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_stock_opnames_tanggal ON public.stock_opnames(tanggal);
CREATE INDEX IF NOT EXISTS idx_stock_opname_details_opname_id ON public.stock_opname_details(opname_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_details_kode ON public.stock_opname_details(kode);

-- 2. Pastikan tabel Penerimaan & Pengeluaran Barang Lain tersedia (untuk adjustment non-opname)
CREATE TABLE IF NOT EXISTS public.penerimaan_barang_lains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  lokasi_stock TEXT DEFAULT '01 - OFFICE',
  customer TEXT DEFAULT '',
  kode_barang TEXT DEFAULT '',
  nama_barang TEXT DEFAULT '',
  qty NUMERIC(18,2) DEFAULT 0,
  keterangan TEXT DEFAULT '',
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pengeluaran_barang_lains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  lokasi_stock TEXT DEFAULT '01 - OFFICE',
  customer TEXT DEFAULT '',
  kode_barang TEXT DEFAULT '',
  nama_barang TEXT DEFAULT '',
  qty NUMERIC(18,2) DEFAULT 0,
  keterangan TEXT DEFAULT '',
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. View Laporan Stock Opname (Drop CASCADE agar aman dari error 42P16, gunakan security_invoker = true)
DROP VIEW IF EXISTS public.v_laporan_stock_opname CASCADE;
CREATE VIEW public.v_laporan_stock_opname
WITH (security_invoker = true)
AS
SELECT
  so.id AS opname_id,
  so.no_bukti,
  so.tanggal,
  so.lokasi_stock,
  so.sts_post,
  so.keterangan,
  sod.kode AS kode_barang,
  sod.nama_barang,
  sod.unit,
  COALESCE(sod.stock_sistem, 0) AS stock_sistem,
  COALESCE(sod.stock_fisik, 0) AS stock_fisik,
  COALESCE(sod.selisih, 0) AS selisih,
  COALESCE(sod.hpp, 0) AS hpp,
  COALESCE(sod.total_selisih, 0) AS total_selisih,
  COALESCE(sod.keterangan, '') AS detail_keterangan
FROM public.stock_opnames so
LEFT JOIN public.stock_opname_details sod ON sod.opname_id = so.id;

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penerimaan_barang_lains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran_barang_lains ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'stock_opnames',
    'stock_opname_details',
    'penerimaan_barang_lains',
    'pengeluaran_barang_lains'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Enable all access for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for service_role" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Enable all access for service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;
