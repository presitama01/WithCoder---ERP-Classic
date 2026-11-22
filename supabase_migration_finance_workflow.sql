-- ============================================================================
-- MIGRATION SQL MODUL KEUANGAN (HPP PEMBELIAN, JURNAL UMUM & LAPORAN KEUANGAN)
-- Idempotent: Aman dijalankan berulang kali di Supabase SQL Editor
-- ============================================================================

-- 1. Chart of Accounts (Master Akun / COA) jika belum ada
CREATE TABLE IF NOT EXISTS public.master_akuns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_akun TEXT NOT NULL UNIQUE,
  nama_akun TEXT NOT NULL,
  tipe_akun TEXT DEFAULT 'NERACA', -- NERACA, LABA_RUGI
  kategori TEXT DEFAULT 'AKTIVA', -- AKTIVA, PASIVA, MODAL, PENDAPATAN, BIAYA
  saldo_normal TEXT DEFAULT 'DEBIT', -- DEBIT, KREDIT
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel HPP Pembelian Barang
CREATE TABLE IF NOT EXISTS public.hpp_pembelians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  nama_supplier TEXT NOT NULL DEFAULT '',
  no_po TEXT DEFAULT '',
  no_faktur_pembelian TEXT DEFAULT '',
  keterangan TEXT DEFAULT '',
  nilai_pembelian NUMERIC(18,2) DEFAULT 0,
  jth_tmp DATE,
  sts_lunas TEXT DEFAULT 'Not Yet',
  tgl_lunas DATE,
  sts_post TEXT DEFAULT 'Not Yet',
  tgl_post DATE,
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  tgl_created DATE DEFAULT CURRENT_DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel Jurnal Umum (Header & Details)
CREATE TABLE IF NOT EXISTS public.jurnal_umum_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT DEFAULT '',
  total_debit NUMERIC(18,2) DEFAULT 0,
  total_kredit NUMERIC(18,2) DEFAULT 0,
  status_balance BOOLEAN DEFAULT true,
  sts_post TEXT DEFAULT 'Posting',
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  tgl_created DATE DEFAULT CURRENT_DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jurnal_umum_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurnal_id UUID NOT NULL REFERENCES public.jurnal_umum_headers(id) ON DELETE CASCADE,
  no_urut INTEGER DEFAULT 1,
  kode_akun TEXT NOT NULL DEFAULT '',
  nama_akun TEXT NOT NULL DEFAULT '',
  debet NUMERIC(18,2) DEFAULT 0,
  kredit NUMERIC(18,2) DEFAULT 0,
  keterangan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.jurnal_umum_details
  ADD COLUMN IF NOT EXISTS debet NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kredit NUMERIC(18,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_jurnal_details_jurnal_id ON public.jurnal_umum_details(jurnal_id);

-- 4. View Laporan Kertas Kerja / Rekapitulasi Jurnal menggunakan kolom "debet" (security_invoker = true)
DROP VIEW IF EXISTS public.v_laporan_kertas_kerja CASCADE;
CREATE VIEW public.v_laporan_kertas_kerja
WITH (security_invoker = true)
AS
SELECT
  jd.kode_akun,
  jd.nama_akun,
  SUM(COALESCE(jd.debet, 0)) AS total_debit,
  SUM(COALESCE(jd.kredit, 0)) AS total_kredit,
  CASE 
    WHEN SUM(COALESCE(jd.debet, 0)) >= SUM(COALESCE(jd.kredit, 0)) 
    THEN SUM(COALESCE(jd.debet, 0)) - SUM(COALESCE(jd.kredit, 0)) 
    ELSE 0 
  END AS saldo_debit,
  CASE 
    WHEN SUM(COALESCE(jd.kredit, 0)) > SUM(COALESCE(jd.debet, 0)) 
    THEN SUM(COALESCE(jd.kredit, 0)) - SUM(COALESCE(jd.debet, 0)) 
    ELSE 0 
  END AS saldo_kredit
FROM public.jurnal_umum_details jd
JOIN public.jurnal_umum_headers jh ON jh.id = jd.jurnal_id
WHERE UPPER(COALESCE(jh.sts_post, '')) IN ('POSTING', 'POSTED')
GROUP BY jd.kode_akun, jd.nama_akun;

-- 5. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.master_akuns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hpp_pembelians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal_umum_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal_umum_details ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'master_akuns',
    'hpp_pembelians',
    'jurnal_umum_headers',
    'jurnal_umum_details'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Enable all access for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for service_role" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Enable all access for service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;
