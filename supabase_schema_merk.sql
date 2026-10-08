-- ============================================================
-- SQL Schema & Seed Data untuk Tabel Merk (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Merk
CREATE TABLE IF NOT EXISTS public.tabel_merk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama_merk VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk pencarian cepat berdasarkan Kode dan Nama Merk
CREATE INDEX IF NOT EXISTS idx_merk_kode ON public.tabel_merk(kode);
CREATE INDEX IF NOT EXISTS idx_merk_nama ON public.tabel_merk(nama_merk);

-- 3. Komentar Kolom & Tabel
COMMENT ON TABLE public.tabel_merk IS 'Tabel Master Merk / Brand Barang ERP';
COMMENT ON COLUMN public.tabel_merk.kode IS 'Kode Merk (contoh: 0130, 0037, 0129)';
COMMENT ON COLUMN public.tabel_merk.nama_merk IS 'Nama Merk / Brand Barang (contoh: A&D, ACCUR, BOSCH, CASIO)';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.tabel_merk ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read untuk semua user" 
ON public.tabel_merk 
FOR SELECT 
USING (true);

CREATE POLICY "Izinkan Insert untuk authenticated user" 
ON public.tabel_merk 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Izinkan Update untuk authenticated user" 
ON public.tabel_merk 
FOR UPDATE 
USING (true);

CREATE POLICY "Izinkan Delete untuk authenticated user" 
ON public.tabel_merk 
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

DROP TRIGGER IF EXISTS trigger_merk_updated_at ON public.tabel_merk;
CREATE TRIGGER trigger_merk_updated_at
BEFORE UPDATE ON public.tabel_merk
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. Insert Data Awal (Diambil langsung dari Screenshot Master Merk)
INSERT INTO public.tabel_merk (kode, nama_merk)
VALUES 
    ('0130', 'A&D'),
    ('0037', 'ACCUR'),
    ('0129', 'ALTERNATIVE RAYTEK'),
    ('0092', 'AMTEC'),
    ('0077', 'AND'),
    ('0057', 'ANRITSU'),
    ('0029', 'ASAHI'),
    ('0017', 'ASIMETO'),
    ('0036', 'ATAGO'),
    ('0038', 'ATTONIC'),
    ('0116', 'AUTONIC'),
    ('0106', 'BALANZA'),
    ('0138', 'BARCOL'),
    ('0043', 'BEAKER'),
    ('0121', 'BELONA'),
    ('0021', 'BEVS'),
    ('0068', 'BIAYA'),
    ('0112', 'BINDEX 717.10'),
    ('0105', 'BOSCH'),
    ('0082', 'CARMAR'),
    ('0140', 'CARTON'),
    ('0079', 'CASIO'),
    ('0101', 'CITIZEN'),
    ('0039', 'CODE'),
    ('0041', 'CONSTANT'),
    ('0042', 'DEFELSKO'),
    ('0141', 'DIATES'),
    ('0027', 'DINAMEC SYSTEM')
ON CONFLICT (kode) DO NOTHING;
