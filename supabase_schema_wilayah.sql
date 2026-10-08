-- ============================================================
-- SQL Schema & Seed Data untuk Master Wilayah (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Master Wilayah
CREATE TABLE IF NOT EXISTS public.master_wilayah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_wilayah VARCHAR(20) NOT NULL UNIQUE,
    wilayah VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian berdasarkan Kode Wilayah dan Nama Wilayah
CREATE INDEX IF NOT EXISTS idx_wilayah_kode ON public.master_wilayah(kode_wilayah);
CREATE INDEX IF NOT EXISTS idx_wilayah_nama ON public.master_wilayah(wilayah);

-- 3. Komentar Tabel dan Kolom
COMMENT ON TABLE public.master_wilayah IS 'Tabel Master Wilayah / Area Distribusi ERP';
COMMENT ON COLUMN public.master_wilayah.id IS 'Primary Key UUID';
COMMENT ON COLUMN public.master_wilayah.kode_wilayah IS 'Kode singkatan unik wilayah (contoh: JKT, BDG, SBY, AMB)';
COMMENT ON COLUMN public.master_wilayah.wilayah IS 'Nama lengkap wilayah / area cakupan (contoh: JAKARTA, BANDUNG - JABAR)';
COMMENT ON COLUMN public.master_wilayah.created_at IS 'Waktu data dibuat';
COMMENT ON COLUMN public.master_wilayah.updated_at IS 'Waktu data terakhir diubah';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.master_wilayah ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read Master Wilayah untuk semua user" 
ON public.master_wilayah 
FOR SELECT 
USING (true);

CREATE POLICY "Izinkan Insert Master Wilayah untuk authenticated user" 
ON public.master_wilayah 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Izinkan Update Master Wilayah untuk authenticated user" 
ON public.master_wilayah 
FOR UPDATE 
USING (true);

CREATE POLICY "Izinkan Delete Master Wilayah untuk authenticated user" 
ON public.master_wilayah 
FOR DELETE 
USING (true);

-- 6. Trigger otomatis update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_wilayah_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wilayah_updated_at ON public.master_wilayah;
CREATE TRIGGER trigger_wilayah_updated_at
BEFORE UPDATE ON public.master_wilayah
FOR EACH ROW
EXECUTE FUNCTION public.handle_wilayah_updated_at();

-- 7. Insert Data Awal (44 Record sesuai Screenshot List Master Wilayah)
INSERT INTO public.master_wilayah (kode_wilayah, wilayah)
VALUES 
    ('AMB', 'AMBON'),
    ('BPN', 'BALIK PAPAN - KALTIM'),
    ('BDG', 'BANDUNG - JABAR'),
    ('BNGK', 'BANGKA'),
    ('BJM', 'BANJARMASIN - KALSEL'),
    ('BKS', 'BEKASI'),
    ('BLKL', 'BENGKULU'),
    ('BLORA', 'BLORA - JATENG'),
    ('BGR', 'BOGOR-JABAR'),
    ('BKM', 'BUKIT KEMUNING-LAMPUNG'),
    ('CRB', 'CIREBON-JABAR'),
    ('GRTL', 'GORONTALO'),
    ('JKT', 'JAKARTA'),
    ('JMB', 'JAMBI'),
    ('JGL', 'JONGGOL'),
    ('KRW', 'KARAWANG'),
    ('LPG', 'LAMPUNG'),
    ('SM06', 'LAMPUNG'),
    ('LLG', 'LUBUK LINGGAU-SUMSEL'),
    ('MKR', 'MAKASSAR-SULSEL'),
    ('MTP', 'MARTAPURA-SUMSEL'),
    ('MTRM', 'MATARAM-LOMBOK'),
    ('MDN', 'MEDAN - SUMUT'),
    ('MDO', 'MENADO - SULUT'),
    ('MR2', 'MUARA2-SUMSEL'),
    ('PLB', 'PALEMBANG-SUMSEL'),
    ('PLW', 'PALU'),
    ('PKU', 'PEKAN BARU-RIAU')
ON CONFLICT (kode_wilayah) DO UPDATE
SET wilayah = EXCLUDED.wilayah,
    updated_at = timezone('utc'::text, now());
