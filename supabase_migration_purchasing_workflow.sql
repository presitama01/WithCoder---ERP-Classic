-- ============================================================================
-- SQL MIGRATION: INTEGRASI END-TO-END MODUL PEMBELIAN, GIRO, STOK & HPP
-- (PR Detail -> PO -> Pembelian Barang -> Retur Pembelian -> Giro -> Stok/HPP)
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================================

-- 1. Tabel Detail Purchase Request (purchase_request_details)
CREATE TABLE IF NOT EXISTS public.purchase_request_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
    no_pr VARCHAR(100),
    no_urut INTEGER NOT NULL DEFAULT 1,
    kode VARCHAR(100) NOT NULL,
    nama_barang VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'PCS',
    qty NUMERIC(18,2) NOT NULL DEFAULT 1,
    keterangan TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.purchase_requests
    ADD COLUMN IF NOT EXISTS no_po VARCHAR(100) DEFAULT '-',
    ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_purchase_request_details_pr_id ON public.purchase_request_details(pr_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_details_no_pr ON public.purchase_request_details(no_pr);

ALTER TABLE public.purchase_request_details ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchase_request_details' AND policyname = 'Allow all access purchase_request_details'
    ) THEN
        CREATE POLICY "Allow all access purchase_request_details"
            ON public.purchase_request_details FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Pastikan seluruh kolom yang dibutuhkan tersedia pada purchase_orders
ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS no_pr VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mata_uang VARCHAR(20) DEFAULT 'IDR',
    ADD COLUMN IF NOT EXISTS ppn NUMERIC(8,2) DEFAULT 11,
    ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tgl_lunas DATE,
    ADD COLUMN IF NOT EXISTS persen NUMERIC(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS po_close VARCHAR(30) DEFAULT 'Not Yet';

-- 3. Tambah kolom relasi PO, Faktur, Lunas, Mata Uang, PPN, dan Nominal PPN pada pembelian_barangs
ALTER TABLE public.pembelian_barangs
    ADD COLUMN IF NOT EXISTS no_po TEXT DEFAULT '-',
    ADD COLUMN IF NOT EXISTS no_faktur TEXT DEFAULT '-',
    ADD COLUMN IF NOT EXISTS sts_lunas TEXT DEFAULT 'Belum',
    ADD COLUMN IF NOT EXISTS tgl_lunas DATE,
    ADD COLUMN IF NOT EXISTS mata_uang VARCHAR(20) DEFAULT 'IDR',
    ADD COLUMN IF NOT EXISTS ppn NUMERIC(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pembelian_barangs_no_po ON public.pembelian_barangs(no_po);
CREATE INDEX IF NOT EXISTS idx_pembelian_barangs_no_faktur ON public.pembelian_barangs(no_faktur);
CREATE INDEX IF NOT EXISTS idx_pembelian_barangs_sts_lunas ON public.pembelian_barangs(sts_lunas);

-- 4. Tambah kolom Ref. No. Pembelian, No. PO, Disc, dan Nominal PPN pada retur_pembelians
ALTER TABLE public.retur_pembelians
    ADD COLUMN IF NOT EXISTS no_pembelian VARCHAR(100) DEFAULT '-',
    ADD COLUMN IF NOT EXISTS no_po VARCHAR(100) DEFAULT '-',
    ADD COLUMN IF NOT EXISTS no_faktur VARCHAR(100) DEFAULT '-',
    ADD COLUMN IF NOT EXISTS mata_uang VARCHAR(20) DEFAULT 'IDR',
    ADD COLUMN IF NOT EXISTS disc NUMERIC(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nilai_disc NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ppn NUMERIC(8,2) DEFAULT 11,
    ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_retur_pembelians_no_pembelian ON public.retur_pembelians(no_pembelian);
CREATE INDEX IF NOT EXISTS idx_retur_pembelians_no_po ON public.retur_pembelians(no_po);

-- 5. Tambah kolom Referensi Pembelian/PO, No. Faktur, dan Status Cair pada giro_pembelian_details
ALTER TABLE public.giro_pembelian_details
    ADD COLUMN IF NOT EXISTS ref_type VARCHAR(30) DEFAULT '',
    ADD COLUMN IF NOT EXISTS no_ref VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS no_faktur VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS sts_cair VARCHAR(30) DEFAULT 'Cair';

CREATE INDEX IF NOT EXISTS idx_giro_pembelian_details_no_ref ON public.giro_pembelian_details(no_ref);
CREATE INDEX IF NOT EXISTS idx_giro_pembelian_details_ref_type ON public.giro_pembelian_details(ref_type);

-- 6. Pastikan kolom no_po tersedia di hpp_pembelians jika tabel sudah ada
ALTER TABLE IF EXISTS public.hpp_pembelians
    ADD COLUMN IF NOT EXISTS no_po VARCHAR(100) DEFAULT '-';

-- 7. Refresh schema cache Supabase PostgREST
NOTIFY pgrst, 'reload schema';
