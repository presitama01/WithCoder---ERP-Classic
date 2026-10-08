-- ============================================================
-- SQL Schema & Seed Data untuk Tabel Category (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Category
CREATE TABLE IF NOT EXISTS public.tabel_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama_kategori VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk pencarian cepat berdasarkan Kode dan Nama Kategori
CREATE INDEX IF NOT EXISTS idx_category_kode ON public.tabel_category(kode);
CREATE INDEX IF NOT EXISTS idx_category_nama ON public.tabel_category(nama_kategori);

-- 3. Komentar Kolom & Tabel
COMMENT ON TABLE public.tabel_category IS 'Tabel Master Kategori Barang & Jasa ERP';
COMMENT ON COLUMN public.tabel_category.kode IS 'Kode Kategori (contoh: 0001, 0002)';
COMMENT ON COLUMN public.tabel_category.nama_kategori IS 'Nama Deskripsi Kategori (contoh: PRODUCT, SERVICES)';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.tabel_category ENABLE ROW LEVEL SECURITY;

-- 5. Policy Akses (Bebas disesuaikan untuk public / authenticated user)
CREATE POLICY "Izinkan Read untuk semua user" 
ON public.tabel_category 
FOR SELECT 
USING (true);

CREATE POLICY "Izinkan Insert untuk authenticated user" 
ON public.tabel_category 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Izinkan Update untuk authenticated user" 
ON public.tabel_category 
FOR UPDATE 
USING (true);

CREATE POLICY "Izinkan Delete untuk authenticated user" 
ON public.tabel_category 
FOR DELETE 
USING (true);

-- 6. Trigger otomatis update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_category_updated_at ON public.tabel_category;
CREATE TRIGGER trigger_category_updated_at
BEFORE UPDATE ON public.tabel_category
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. Insert Data Awal (Sesuai Gambar / Screenshot)
INSERT INTO public.tabel_category (kode, nama_kategori)
VALUES 
    ('0001', 'PRODUCT'),
    ('0002', 'SERVICES')
ON CONFLICT (kode) DO NOTHING;
