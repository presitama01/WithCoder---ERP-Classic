-- ============================================================================
-- MIGRATION SQL MODUL PENJUALAN (PRIORITAS 1 - 4) - ROBUST & IDEMPOTENT
-- Jalankan di Supabase SQL Editor
-- ============================================================================

-- 1. Pastikan tabel utama Sales Inquiry, Quotation & Order ada
CREATE TABLE IF NOT EXISTS public.sales_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal_si DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_do DATE,
  nama_customer TEXT NOT NULL DEFAULT '',
  nama_sales TEXT DEFAULT '',
  qty NUMERIC(18,2) DEFAULT 0,
  keterangan TEXT DEFAULT '',
  follow TEXT DEFAULT 'Follow',
  tgl_follow DATE,
  no_sq TEXT DEFAULT '',
  tgl_sq DATE,
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  tgl_created DATE DEFAULT CURRENT_DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_sq TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  no_inquiry TEXT DEFAULT '',
  si_id UUID REFERENCES public.sales_inquiries(id) ON DELETE SET NULL,
  nama_customer TEXT NOT NULL DEFAULT '',
  sales TEXT DEFAULT '',
  lokasi_stock TEXT DEFAULT '01 - OFFICE',
  keterangan TEXT DEFAULT '',
  ppn NUMERIC(8,2) DEFAULT 11,
  subtotal NUMERIC(18,2) DEFAULT 0,
  disc_pct NUMERIC(8,2) DEFAULT 0,
  nilai_disc NUMERIC(18,2) DEFAULT 0,
  dpp NUMERIC(18,2) DEFAULT 0,
  nilai_ppn NUMERIC(18,2) DEFAULT 0,
  nilai_sq NUMERIC(18,2) DEFAULT 0,
  valid_until DATE,
  sts_so TEXT DEFAULT 'Open',
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  tgl_created DATE DEFAULT CURRENT_DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_bukti TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  nama_customer TEXT NOT NULL DEFAULT '',
  sales TEXT DEFAULT '',
  po_no TEXT DEFAULT '',
  no_sq TEXT DEFAULT '',
  si_id UUID REFERENCES public.sales_inquiries(id) ON DELETE SET NULL,
  nilai_so NUMERIC(18,2) DEFAULT 0,
  deposit NUMERIC(18,2) DEFAULT 0,
  tgl_kirim DATE,
  persen NUMERIC(8,2) DEFAULT 0,
  keterangan TEXT DEFAULT '',
  ppn NUMERIC(8,2) DEFAULT 11,
  subtotal NUMERIC(18,2) DEFAULT 0,
  disc_pct NUMERIC(8,2) DEFAULT 0,
  nilai_disc NUMERIC(18,2) DEFAULT 0,
  dpp NUMERIC(18,2) DEFAULT 0,
  nilai_ppn NUMERIC(18,2) DEFAULT 0,
  is_ppn_included BOOLEAN DEFAULT false,
  so_close TEXT DEFAULT 'Not Yet',
  lokasi_stock TEXT DEFAULT '01 - OFFICE',
  dibuat_oleh TEXT DEFAULT 'ADMIN',
  tgl_created DATE DEFAULT CURRENT_DATE,
  diupdate_oleh TEXT DEFAULT '-',
  tgl_update DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pastikan semua kolom penting ada pada tabel-tabel terkait (ADD COLUMN IF NOT EXISTS)
ALTER TABLE public.sales_inquiry_details
  ADD COLUMN IF NOT EXISTS si_id UUID REFERENCES public.sales_inquiries(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS no_bukti TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS no_urut INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kode TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nama_barang TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS qty NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_harga NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '';

ALTER TABLE public.sales_quotations
  ADD COLUMN IF NOT EXISTS si_id UUID REFERENCES public.sales_inquiries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS no_inquiry TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ppn NUMERIC(8,2) DEFAULT 11,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disc_pct NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_disc NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dpp NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_until DATE,
  ADD COLUMN IF NOT EXISTS sts_so TEXT DEFAULT 'Open';

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS si_id UUID REFERENCES public.sales_inquiries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS no_sq TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disc_pct NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_disc NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dpp NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_ppn_included BOOLEAN DEFAULT false;

ALTER TABLE public.surat_jalans
  ADD COLUMN IF NOT EXISTS nama_expedisi TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS no_polisi TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nama_supir TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS alamat_kirim TEXT DEFAULT '';

ALTER TABLE public.faktur_penjualans
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disc_pct NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_disc NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dpp NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_dp TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_dp NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dp_used_on_faktur TEXT DEFAULT '';

ALTER TABLE public.giro_penjualan_details
  ADD COLUMN IF NOT EXISTS ref_type TEXT DEFAULT 'FAKTUR',
  ADD COLUMN IF NOT EXISTS no_ref TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS no_faktur TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sts_cair TEXT DEFAULT 'Belum Cair',
  ADD COLUMN IF NOT EXISTS tgl_cair DATE;

ALTER TABLE public.retur_penjualans
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_disc NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dpp NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.retur_penjualan_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retur_id UUID NOT NULL REFERENCES public.retur_penjualans(id) ON DELETE CASCADE,
  no_bukti TEXT NOT NULL,
  no_urut INTEGER DEFAULT 1,
  kode TEXT NOT NULL DEFAULT '',
  nama_barang TEXT NOT NULL DEFAULT '',
  unit TEXT DEFAULT 'PCS',
  qty_faktur NUMERIC(18,2) DEFAULT 0,
  qty NUMERIC(18,2) DEFAULT 0,
  harga NUMERIC(18,2) DEFAULT 0,
  jumlah NUMERIC(18,2) DEFAULT 0,
  total NUMERIC(18,2) DEFAULT 0,
  alasan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.retur_penjualan_details
  ADD COLUMN IF NOT EXISTS alasan TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS qty_faktur NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS harga NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jumlah NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(18,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_si_details_si_id ON public.sales_inquiry_details(si_id);
CREATE INDEX IF NOT EXISTS idx_retur_penjualan_details_retur_id ON public.retur_penjualan_details(retur_id);

-- 3. Views Laporan Penjualan (Drop CASCADE untuk menghindari error 42P16, gunakan security_invoker = true)
DROP VIEW IF EXISTS public.v_mutasi_sales_order CASCADE;
CREATE VIEW public.v_mutasi_sales_order
WITH (security_invoker = true)
AS
SELECT
  sod.id AS id,
  so.id AS so_id,
  so.no_bukti AS no_so,
  so.po_no AS no_po,
  COALESCE(so.no_sq, '') AS no_sq,
  so.nama_customer AS customer,
  so.sales AS sales,
  so.lokasi_stock AS lokasi_stock,
  so.tanggal AS tanggal,
  so.so_close AS so_close,
  sod.kode AS kode_barang,
  sod.nama_barang AS nama_barang,
  sod.unit AS unit,
  COALESCE(sod.qty, 0) AS pesan,
  COALESCE(sj_agg.total_kirim, sod.terima, 0) AS kirim,
  GREATEST(0, COALESCE(sod.qty, 0) - COALESCE(sj_agg.total_kirim, sod.terima, 0)) AS sisa,
  COALESCE(sod.harga, 0) AS harga,
  COALESCE(sod.total, 0) AS total
FROM public.sales_order_details sod
JOIN public.sales_orders so ON so.id = sod.so_id
LEFT JOIN (
  SELECT
    sj.no_so,
    sjd.kode,
    SUM(COALESCE(NULLIF(sjd.terima, 0), sjd.qty, 0)) AS total_kirim
  FROM public.surat_jalan_details sjd
  JOIN public.surat_jalans sj ON sj.id = sjd.surat_jalan_id
  WHERE UPPER(COALESCE(sj.sts_post, '')) IN ('POSTING', 'POSTED')
  GROUP BY sj.no_so, sjd.kode
) sj_agg
  ON UPPER(COALESCE(sj_agg.no_so, '')) = UPPER(COALESCE(so.no_bukti, ''))
 AND UPPER(COALESCE(sj_agg.kode, '')) = UPPER(COALESCE(sod.kode, ''));

DROP VIEW IF EXISTS public.v_laporan_surat_jalan CASCADE;
CREATE VIEW public.v_laporan_surat_jalan
WITH (security_invoker = true)
AS
SELECT
  sj.id AS sj_id,
  sj.no_bukti,
  sj.tanggal,
  sj.nama_customer,
  sj.no_so,
  sj.po_no,
  sj.sales,
  sj.no_faktur,
  sj.lokasi_stock,
  COALESCE(sj.nama_expedisi, '') AS nama_expedisi,
  COALESCE(sj.no_polisi, '') AS no_polisi,
  COALESCE(sj.nama_supir, '') AS nama_supir,
  sj.sts_print,
  sj.sts_post,
  sj.keterangan,
  sjd.kode,
  sjd.nama_barang,
  sjd.unit,
  sjd.qty,
  sjd.terima
FROM public.surat_jalans sj
LEFT JOIN public.surat_jalan_details sjd ON sjd.surat_jalan_id = sj.id;

DROP VIEW IF EXISTS public.v_laporan_penjualan_barang CASCADE;
CREATE VIEW public.v_laporan_penjualan_barang
WITH (security_invoker = true)
AS
SELECT
  fp.id AS faktur_id,
  fp.jenis_faktur,
  fp.no_bukti,
  fp.tanggal,
  fp.nama_customer,
  COALESCE(mc.kode_customer, '') AS kode_customer,
  fp.no_so,
  fp.no_sj,
  fp.po_no,
  fp.sales,
  COALESCE(ms.kode_sales, fp.sales) AS kode_sales,
  fp.lokasi_stock,
  fp.jth_tmp,
  CASE WHEN fp.jth_tmp IS NULL OR fp.jth_tmp <= fp.tanggal THEN 'TUNAI' ELSE 'KREDIT' END AS cara_bayar,
  fp.ppn,
  COALESCE(fp.dpp, 0) AS dpp,
  COALESCE(fp.nilai_ppn, 0) AS nilai_ppn,
  fp.nilai_penjualan,
  fp.sts_lunas,
  fp.sts_post,
  fpd.kode AS kode_barang,
  fpd.nama_barang,
  COALESCE(mb.merk, '') AS merk_barang,
  fpd.unit,
  fpd.qty,
  fpd.harga,
  fpd.total
FROM public.faktur_penjualans fp
LEFT JOIN public.faktur_penjualan_details fpd ON fpd.faktur_id = fp.id
LEFT JOIN public.master_barangs mb ON UPPER(mb.kode) = UPPER(fpd.kode)
LEFT JOIN public.master_sales ms ON UPPER(ms.nama_sales) = UPPER(fp.sales) OR UPPER(ms.kode_sales) = UPPER(fp.sales)
LEFT JOIN public.master_customers mc ON UPPER(mc.nama_customer) = UPPER(fp.nama_customer);

DROP VIEW IF EXISTS public.v_laporan_retur_penjualan CASCADE;
CREATE VIEW public.v_laporan_retur_penjualan
WITH (security_invoker = true)
AS
SELECT
  rp.id AS retur_id,
  rp.no_bukti,
  rp.tanggal,
  rp.nama_customer,
  rp.no_faktur,
  rp.lokasi_stock,
  rp.disc,
  rp.ppn,
  rp.nilai_retur,
  rp.sts_post,
  rp.keterangan,
  rpd.kode,
  rpd.nama_barang,
  rpd.unit,
  rpd.qty,
  rpd.harga,
  rpd.total,
  COALESCE(rpd.alasan, '') AS alasan
FROM public.retur_penjualans rp
LEFT JOIN public.retur_penjualan_details rpd ON rpd.retur_id = rp.id;

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.sales_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_inquiry_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quotation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_jalans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_jalan_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faktur_penjualans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faktur_penjualan_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giro_penjualan_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giro_penjualan_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retur_penjualans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retur_penjualan_details ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'sales_inquiries',
    'sales_inquiry_details',
    'sales_quotations',
    'sales_quotation_details',
    'sales_orders',
    'sales_order_details',
    'surat_jalans',
    'surat_jalan_details',
    'faktur_penjualans',
    'faktur_penjualan_details',
    'giro_penjualan_headers',
    'giro_penjualan_details',
    'retur_penjualans',
    'retur_penjualan_details'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Enable all access for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for service_role" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Enable all access for service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;
