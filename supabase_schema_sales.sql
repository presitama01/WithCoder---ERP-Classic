-- ============================================================
-- SQL Schema & Update untuk Master Sales (Supabase / PostgreSQL)
-- Menambahkan kolom Email pada tabel master_sales + Index Cari
-- ============================================================

-- 1. Pastikan tabel master_sales dan seluruh kolom tersedia
CREATE TABLE IF NOT EXISTS public.master_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_sales VARCHAR(50) NOT NULL UNIQUE,
    nama_sales VARCHAR(150) NOT NULL,
    alamat TEXT,
    kota VARCHAR(100),
    telepon VARCHAR(50),
    email VARCHAR(150),
    limit_kredit NUMERIC(18,2) DEFAULT 0,
    komisi NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tambahkan kolom baru jika tabel master_sales sudah ada sebelumnya
ALTER TABLE public.master_sales
    ADD COLUMN IF NOT EXISTS alamat TEXT,
    ADD COLUMN IF NOT EXISTS kota VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telepon VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS limit_kredit NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS komisi NUMERIC(5,2) DEFAULT 0;

-- 3. Index untuk mempercepat fitur Cari (Kode, Nama Sales, Kota, Email)
CREATE INDEX IF NOT EXISTS idx_master_sales_kode ON public.master_sales(kode_sales);
CREATE INDEX IF NOT EXISTS idx_master_sales_nama ON public.master_sales(nama_sales);
CREATE INDEX IF NOT EXISTS idx_master_sales_kota ON public.master_sales(kota);
CREATE INDEX IF NOT EXISTS idx_master_sales_email ON public.master_sales(email);

-- 4. Aktifkan Row Level Security (RLS) & Kebijakan Akses
ALTER TABLE public.master_sales ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_sales' AND policyname = 'Allow all access master_sales'
    ) THEN
        CREATE POLICY "Allow all access master_sales"
            ON public.master_sales FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Trigger otomatis update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sales_updated_at ON public.master_sales;
CREATE TRIGGER trigger_sales_updated_at
BEFORE UPDATE ON public.master_sales
FOR EACH ROW
EXECUTE FUNCTION public.handle_sales_updated_at();

-- 6. Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';
