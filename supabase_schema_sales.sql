-- ============================================================
-- SQL Schema & Seed Data untuk Master Sales (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Master Sales
CREATE TABLE IF NOT EXISTS public.master_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_sales VARCHAR(50) NOT NULL UNIQUE,
    nama_sales VARCHAR(150) NOT NULL,
    alamat TEXT,
    kota VARCHAR(100),
    phone VARCHAR(50),
    area VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian
CREATE INDEX IF NOT EXISTS idx_sales_kode ON public.master_sales(kode_sales);
CREATE INDEX IF NOT EXISTS idx_sales_nama ON public.master_sales(nama_sales);

-- 3. Komentar Tabel dan Kolom
COMMENT ON TABLE public.master_sales IS 'Tabel Master Sales / Tenaga Penjual';
COMMENT ON COLUMN public.master_sales.id IS 'Primary Key UUID';
COMMENT ON COLUMN public.master_sales.kode_sales IS 'Kode unik sales (contoh: SL01, BUDI)';
COMMENT ON COLUMN public.master_sales.nama_sales IS 'Nama lengkap sales';
COMMENT ON COLUMN public.master_sales.alamat IS 'Alamat sales';
COMMENT ON COLUMN public.master_sales.kota IS 'Kota domisili sales';
COMMENT ON COLUMN public.master_sales.phone IS 'Nomor Telepon / HP sales';
COMMENT ON COLUMN public.master_sales.area IS 'Area / Wilayah penjualan sales';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.master_sales ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read Master Sales untuk semua user" ON public.master_sales FOR SELECT USING (true);
CREATE POLICY "Izinkan Insert Master Sales untuk authenticated user" ON public.master_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Izinkan Update Master Sales untuk authenticated user" ON public.master_sales FOR UPDATE USING (true);
CREATE POLICY "Izinkan Delete Master Sales untuk authenticated user" ON public.master_sales FOR DELETE USING (true);

-- 6. Trigger otomatis update timestamp updated_at
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

-- 7. Insert Data Contoh
INSERT INTO public.master_sales (kode_sales, nama_sales, alamat, kota, phone, area)
VALUES 
    ('SL01', 'BUDI SANTOSO', 'Jl. Merdeka No. 10', 'JAKARTA PUSAT', '081234567890', 'JAKARTA'),
    ('SL02', 'SITI AMINAH', 'Jl. Sudirman No. 45', 'BANDUNG', '081987654321', 'BANDUNG - JABAR'),
    ('SL03', 'HENDRA WIJAYA', 'Jl. Pemuda No. 12', 'SURABAYA', '081333444555', 'SURABAYA - JATIM')
ON CONFLICT (kode_sales) DO UPDATE
SET nama_sales = EXCLUDED.nama_sales,
    alamat = EXCLUDED.alamat,
    kota = EXCLUDED.kota,
    phone = EXCLUDED.phone,
    area = EXCLUDED.area,
    updated_at = timezone('utc'::text, now());
