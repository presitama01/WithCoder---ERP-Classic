-- ============================================================
-- SQL Schema & Seed Data untuk Master Expedisi (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Master Expedisi
CREATE TABLE IF NOT EXISTS public.master_expedisi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_expedisi VARCHAR(50) NOT NULL UNIQUE,
    nama_expedisi VARCHAR(150) NOT NULL,
    alamat TEXT,
    kota VARCHAR(100),
    phone1 VARCHAR(50),
    phone2 VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian
CREATE INDEX IF NOT EXISTS idx_expedisi_kode ON public.master_expedisi(kode_expedisi);
CREATE INDEX IF NOT EXISTS idx_expedisi_nama ON public.master_expedisi(nama_expedisi);

-- 3. Komentar Tabel dan Kolom
COMMENT ON TABLE public.master_expedisi IS 'Tabel Master Expedisi / Jasa Pengiriman';
COMMENT ON COLUMN public.master_expedisi.id IS 'Primary Key UUID';
COMMENT ON COLUMN public.master_expedisi.kode_expedisi IS 'Kode unik expedisi (contoh: JNE, TIKI, SICEPAT)';
COMMENT ON COLUMN public.master_expedisi.nama_expedisi IS 'Nama lengkap perusahaan expedisi';
COMMENT ON COLUMN public.master_expedisi.alamat IS 'Alamat kantor expedisi';
COMMENT ON COLUMN public.master_expedisi.kota IS 'Kota kantor expedisi';
COMMENT ON COLUMN public.master_expedisi.phone1 IS 'Nomor Telepon utama';
COMMENT ON COLUMN public.master_expedisi.phone2 IS 'Nomor Telepon alternatif';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.master_expedisi ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read Master Expedisi untuk semua user" ON public.master_expedisi FOR SELECT USING (true);
CREATE POLICY "Izinkan Insert Master Expedisi untuk authenticated user" ON public.master_expedisi FOR INSERT WITH CHECK (true);
CREATE POLICY "Izinkan Update Master Expedisi untuk authenticated user" ON public.master_expedisi FOR UPDATE USING (true);
CREATE POLICY "Izinkan Delete Master Expedisi untuk authenticated user" ON public.master_expedisi FOR DELETE USING (true);

-- 6. Trigger otomatis update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_expedisi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expedisi_updated_at ON public.master_expedisi;
CREATE TRIGGER trigger_expedisi_updated_at
BEFORE UPDATE ON public.master_expedisi
FOR EACH ROW
EXECUTE FUNCTION public.handle_expedisi_updated_at();

-- 7. Insert Data Contoh
INSERT INTO public.master_expedisi (kode_expedisi, nama_expedisi, alamat, kota, phone1, phone2)
VALUES 
    ('JNE', 'JALUR NUGRAHA EKAKURIR (JNE)', 'Jl. Tomang Raya No. 11', 'JAKARTA BARAT', '021-5665262', '021-5671412'),
    ('TIKI', 'TITIPAN KILAT (TIKI)', 'Jl. Raden Saleh No. 2', 'JAKARTA PUSAT', '021-3140404', '021-3909505'),
    ('SICEPAT', 'SICEPAT EXPRESS', 'Jl. Cideng Timur No. 56', 'JAKARTA PUSAT', '021-50200505', ''),
    ('JNT', 'J&T EXPRESS', 'Pluit Penjaringan', 'JAKARTA UTARA', '021-80661888', '')
ON CONFLICT (kode_expedisi) DO UPDATE
SET nama_expedisi = EXCLUDED.nama_expedisi,
    alamat = EXCLUDED.alamat,
    kota = EXCLUDED.kota,
    phone1 = EXCLUDED.phone1,
    phone2 = EXCLUDED.phone2,
    updated_at = timezone('utc'::text, now());
