-- ============================================================
-- SQL Schema & Update untuk List Faktur Penjualan & Detail Barang
-- (Supabase / PostgreSQL)
-- ============================================================

-- 1. Pastikan kolom-kolom pada tabel faktur_penjualans lengkap
ALTER TABLE public.faktur_penjualans
    ADD COLUMN IF NOT EXISTS jenis_faktur VARCHAR(30) DEFAULT 'REGULAR',
    ADD COLUMN IF NOT EXISTS no_so VARCHAR(100),
    ADD COLUMN IF NOT EXISTS po_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS no_sj VARCHAR(100),
    ADD COLUMN IF NOT EXISTS no_faktur_pajak VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sales VARCHAR(100),
    ADD COLUMN IF NOT EXISTS jth_tmp DATE,
    ADD COLUMN IF NOT EXISTS keterangan TEXT,
    ADD COLUMN IF NOT EXISTS ppn NUMERIC(6,2) DEFAULT 11,
    ADD COLUMN IF NOT EXISTS nilai_penjualan NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lokasi_stock VARCHAR(120) DEFAULT '01 - OFFICE',
    ADD COLUMN IF NOT EXISTS sts_lunas VARCHAR(30) DEFAULT 'Not Yet',
    ADD COLUMN IF NOT EXISTS tgl_lunas DATE,
    ADD COLUMN IF NOT EXISTS sts_print VARCHAR(30) DEFAULT 'Not Yet',
    ADD COLUMN IF NOT EXISTS tgl_print DATE,
    ADD COLUMN IF NOT EXISTS sts_post VARCHAR(30) DEFAULT 'Not Yet',
    ADD COLUMN IF NOT EXISTS tgl_post DATE,
    ADD COLUMN IF NOT EXISTS dibuat_oleh VARCHAR(100) DEFAULT 'ADMIN',
    ADD COLUMN IF NOT EXISTS tgl_created DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS diupdate_oleh VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tgl_update DATE;

CREATE INDEX IF NOT EXISTS idx_faktur_penjualans_no_so ON public.faktur_penjualans(no_so);
CREATE INDEX IF NOT EXISTS idx_faktur_penjualans_no_bukti ON public.faktur_penjualans(no_bukti);
CREATE INDEX IF NOT EXISTS idx_faktur_penjualans_customer ON public.faktur_penjualans(nama_customer);

-- 2. Buat tabel detail barang Faktur Penjualan (terhubung ke No. SO & Header Faktur)
CREATE TABLE IF NOT EXISTS public.faktur_penjualan_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faktur_id UUID NOT NULL REFERENCES public.faktur_penjualans(id) ON DELETE CASCADE,
    no_bukti VARCHAR(100),
    no_so VARCHAR(100),
    no_urut INTEGER NOT NULL DEFAULT 1,
    kode VARCHAR(100) NOT NULL,
    nama_barang VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'PCS',
    terima NUMERIC(18,2) DEFAULT 0,
    qty NUMERIC(18,2) DEFAULT 1,
    harga NUMERIC(18,2) DEFAULT 0,
    jumlah NUMERIC(18,2) DEFAULT 0,
    total NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faktur_penjualan_details_faktur_id ON public.faktur_penjualan_details(faktur_id);
CREATE INDEX IF NOT EXISTS idx_faktur_penjualan_details_no_so ON public.faktur_penjualan_details(no_so);

-- 3. Aktifkan RLS & Kebijakan Akses
ALTER TABLE public.faktur_penjualans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faktur_penjualan_details ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'faktur_penjualan_details' AND policyname = 'Allow all access faktur_penjualan_details'
    ) THEN
        CREATE POLICY "Allow all access faktur_penjualan_details"
            ON public.faktur_penjualan_details FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Trigger updated_at otomatis
CREATE OR REPLACE FUNCTION public.handle_faktur_detail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_faktur_detail_updated_at ON public.faktur_penjualan_details;
CREATE TRIGGER trigger_faktur_detail_updated_at
BEFORE UPDATE ON public.faktur_penjualan_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_faktur_detail_updated_at();

-- 5. Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';
