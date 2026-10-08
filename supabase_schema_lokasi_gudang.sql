-- =========================================================================
-- SQL Schema & Seed Data: Master Lokasi Gudang (Supabase / PostgreSQL)
-- Menu: MASTER -> Master Lokasi Gudang
-- =========================================================================

-- 1. Buat Tabel Master Lokasi Gudang
CREATE TABLE IF NOT EXISTS public.master_lokasi_gudang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) NOT NULL UNIQUE,
    nama_lokasi VARCHAR(150) NOT NULL,
    alamat TEXT DEFAULT '',
    kota VARCHAR(100) DEFAULT '',
    telepon1 VARCHAR(50) DEFAULT '',
    telepon2 VARCHAR(50) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian data berdasarkan Kode, Nama Lokasi, dan Kota
CREATE INDEX IF NOT EXISTS idx_lokasi_gudang_kode ON public.master_lokasi_gudang(kode);
CREATE INDEX IF NOT EXISTS idx_lokasi_gudang_nama ON public.master_lokasi_gudang(nama_lokasi);
CREATE INDEX IF NOT EXISTS idx_lokasi_gudang_kota ON public.master_lokasi_gudang(kota);

-- 3. Komentar Penjelasan Tabel dan Kolom
COMMENT ON TABLE public.master_lokasi_gudang IS 'Tabel Master Lokasi Kantor / Gudang Penyimpanan ERP';
COMMENT ON COLUMN public.master_lokasi_gudang.id IS 'Primary Key UUID';
COMMENT ON COLUMN public.master_lokasi_gudang.kode IS 'Kode unik lokasi gudang (contoh: 01, 02, GDG-01)';
COMMENT ON COLUMN public.master_lokasi_gudang.nama_lokasi IS 'Nama lokasi / gudang (contoh: OFFICE, GUDANG UTAMA, GUDANG TRANSIT)';
COMMENT ON COLUMN public.master_lokasi_gudang.alamat IS 'Alamat lengkap lokasi / gudang';
COMMENT ON COLUMN public.master_lokasi_gudang.kota IS 'Kota letak gudang / kantor (contoh: JAKARTA, SURABAYA)';
COMMENT ON COLUMN public.master_lokasi_gudang.telepon1 IS 'Nomor telepon utama lokasi';
COMMENT ON COLUMN public.master_lokasi_gudang.telepon2 IS 'Nomor telepon sekunder / fax';
COMMENT ON COLUMN public.master_lokasi_gudang.is_active IS 'Status aktif lokasi gudang (TRUE / FALSE)';
COMMENT ON COLUMN public.master_lokasi_gudang.created_at IS 'Timestamp pembuatan data';
COMMENT ON COLUMN public.master_lokasi_gudang.updated_at IS 'Timestamp update terakhir';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.master_lokasi_gudang ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read Master Lokasi Gudang untuk semua user" 
ON public.master_lokasi_gudang 
FOR SELECT 
USING (true);

CREATE POLICY "Izinkan Insert Master Lokasi Gudang untuk authenticated user" 
ON public.master_lokasi_gudang 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Izinkan Update Master Lokasi Gudang untuk authenticated user" 
ON public.master_lokasi_gudang 
FOR UPDATE 
USING (true);

CREATE POLICY "Izinkan Delete Master Lokasi Gudang untuk authenticated user" 
ON public.master_lokasi_gudang 
FOR DELETE 
USING (true);

-- 6. Trigger Otomatis Update Kolom updated_at
CREATE OR REPLACE FUNCTION public.handle_lokasi_gudang_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lokasi_gudang_updated_at ON public.master_lokasi_gudang;
CREATE TRIGGER trigger_lokasi_gudang_updated_at
BEFORE UPDATE ON public.master_lokasi_gudang
FOR EACH ROW
EXECUTE FUNCTION public.handle_lokasi_gudang_updated_at();

-- 7. Insert Data Awal Sesuai Screenshot (Record 01 - OFFICE - JAKARTA)
INSERT INTO public.master_lokasi_gudang (kode, nama_lokasi, alamat, kota, telepon1, telepon2)
VALUES 
    ('01', 'OFFICE', 'JL. HAYAM WURUK NO. 127', 'JAKARTA', '021-6291234', '021-6295678')
ON CONFLICT (kode) DO UPDATE
SET nama_lokasi = EXCLUDED.nama_lokasi,
    alamat = EXCLUDED.alamat,
    kota = EXCLUDED.kota,
    telepon1 = EXCLUDED.telepon1,
    telepon2 = EXCLUDED.telepon2,
    updated_at = timezone('utc'::text, now());
