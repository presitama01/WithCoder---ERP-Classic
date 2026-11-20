-- ============================================================
-- SQL Schema & Update untuk List Surat Jalan & S.J. Detail
-- (Supabase / PostgreSQL)
-- ============================================================

-- 1. Pastikan tabel surat_jalans dan seluruh kolomnya tersedia
CREATE TABLE IF NOT EXISTS public.surat_jalans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_bukti VARCHAR(100) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nama_customer VARCHAR(255) NOT NULL,
    no_so VARCHAR(100),
    po_no VARCHAR(100),
    sales VARCHAR(100),
    no_faktur VARCHAR(100),
    keterangan TEXT,
    lokasi_stock VARCHAR(120) DEFAULT '01 - OFFICE',
    sts_print VARCHAR(30) DEFAULT 'Not Yet',
    tgl_print DATE,
    sts_post VARCHAR(30) DEFAULT 'Posting',
    tgl_post DATE,
    dibuat_oleh VARCHAR(100) DEFAULT 'ADMIN',
    tgl_created DATE DEFAULT CURRENT_DATE,
    diupdate_oleh VARCHAR(100) DEFAULT '-',
    tgl_update DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.surat_jalans
    ADD COLUMN IF NOT EXISTS no_so VARCHAR(100),
    ADD COLUMN IF NOT EXISTS po_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sales VARCHAR(100),
    ADD COLUMN IF NOT EXISTS no_faktur VARCHAR(100),
    ADD COLUMN IF NOT EXISTS keterangan TEXT,
    ADD COLUMN IF NOT EXISTS lokasi_stock VARCHAR(120) DEFAULT '01 - OFFICE',
    ADD COLUMN IF NOT EXISTS sts_print VARCHAR(30) DEFAULT 'Not Yet',
    ADD COLUMN IF NOT EXISTS tgl_print DATE,
    ADD COLUMN IF NOT EXISTS sts_post VARCHAR(30) DEFAULT 'Posting',
    ADD COLUMN IF NOT EXISTS tgl_post DATE,
    ADD COLUMN IF NOT EXISTS dibuat_oleh VARCHAR(100) DEFAULT 'ADMIN',
    ADD COLUMN IF NOT EXISTS tgl_created DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS diupdate_oleh VARCHAR(100) DEFAULT '-',
    ADD COLUMN IF NOT EXISTS tgl_update DATE;

CREATE INDEX IF NOT EXISTS idx_surat_jalans_no_bukti ON public.surat_jalans(no_bukti);
CREATE INDEX IF NOT EXISTS idx_surat_jalans_no_so ON public.surat_jalans(no_so);
CREATE INDEX IF NOT EXISTS idx_surat_jalans_po_no ON public.surat_jalans(po_no);
CREATE INDEX IF NOT EXISTS idx_surat_jalans_customer ON public.surat_jalans(nama_customer);
CREATE INDEX IF NOT EXISTS idx_surat_jalans_tanggal ON public.surat_jalans(tanggal);

-- 2. Buat tabel S.J. Detail (terhubung ke Header Surat Jalan & No. SO)
CREATE TABLE IF NOT EXISTS public.surat_jalan_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surat_jalan_id UUID NOT NULL REFERENCES public.surat_jalans(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_surat_jalan_details_sj_id ON public.surat_jalan_details(surat_jalan_id);
CREATE INDEX IF NOT EXISTS idx_surat_jalan_details_no_so ON public.surat_jalan_details(no_so);

-- 3. Aktifkan RLS & Kebijakan Akses
ALTER TABLE public.surat_jalans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_jalan_details ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'surat_jalans' AND policyname = 'Allow all access surat_jalans'
    ) THEN
        CREATE POLICY "Allow all access surat_jalans"
            ON public.surat_jalans FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'surat_jalan_details' AND policyname = 'Allow all access surat_jalan_details'
    ) THEN
        CREATE POLICY "Allow all access surat_jalan_details"
            ON public.surat_jalan_details FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Trigger updated_at otomatis untuk surat_jalan_details
CREATE OR REPLACE FUNCTION public.handle_surat_jalan_detail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_surat_jalan_detail_updated_at ON public.surat_jalan_details;
CREATE TRIGGER trigger_surat_jalan_detail_updated_at
BEFORE UPDATE ON public.surat_jalan_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_surat_jalan_detail_updated_at();

-- 5. Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';
