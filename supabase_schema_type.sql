-- ============================================================
-- SQL Schema & Seed Data untuk Tabel Type (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Type
CREATE TABLE IF NOT EXISTS public.tabel_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama_tipe VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian berdasarkan Kode dan Nama Tipe
CREATE INDEX IF NOT EXISTS idx_type_kode ON public.tabel_type(kode);
CREATE INDEX IF NOT EXISTS idx_type_nama ON public.tabel_type(nama_tipe);

-- 3. Komentar Kolom & Tabel
COMMENT ON TABLE public.tabel_type IS 'Tabel Master Tipe / Tipe Barang ERP';
COMMENT ON COLUMN public.tabel_type.kode IS 'Kode Tipe (contoh: 0001, 0002, 0003)';
COMMENT ON COLUMN public.tabel_type.nama_tipe IS 'Nama Tipe Barang (contoh: CONTACT POINT, LIMIT SEAL, UTM-1000D)';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.tabel_type ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read untuk semua user" 
ON public.tabel_type 
FOR SELECT 
USING (true);

CREATE POLICY "Izinkan Insert untuk authenticated user" 
ON public.tabel_type 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Izinkan Update untuk authenticated user" 
ON public.tabel_type 
FOR UPDATE 
USING (true);

CREATE POLICY "Izinkan Delete untuk authenticated user" 
ON public.tabel_type 
FOR DELETE 
USING (true);

-- 6. Trigger otomatis update timestamp updated_at saat data diubah
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_type_updated_at ON public.tabel_type;
CREATE TRIGGER trigger_type_updated_at
BEFORE UPDATE ON public.tabel_type
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. Insert Data Awal (Sesuai Gambar / Screenshot Tabel Type)
INSERT INTO public.tabel_type (kode, nama_tipe)
VALUES 
    ('0001', 'CONTACT POINT'),
    ('0002', 'LIMIT SEAL'),
    ('0003', 'UTM-1000D'),
    ('0005', 'UTM-1000E'),
    ('0004', 'UTM-1000E')
ON CONFLICT (kode) DO NOTHING;
