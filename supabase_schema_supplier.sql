-- ============================================================
-- SQL Schema & Seed Data untuk Master Supplier (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Master Supplier
CREATE TABLE IF NOT EXISTS public.master_supplier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_supplier VARCHAR(50) NOT NULL UNIQUE,
    nama_supplier VARCHAR(150) NOT NULL,
    alamat TEXT,
    kota VARCHAR(100),
    phone VARCHAR(50),
    contact_person VARCHAR(100),
    term VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian
CREATE INDEX IF NOT EXISTS idx_supplier_kode ON public.master_supplier(kode_supplier);
CREATE INDEX IF NOT EXISTS idx_supplier_nama ON public.master_supplier(nama_supplier);

-- 3. Komentar Tabel dan Kolom
COMMENT ON TABLE public.master_supplier IS 'Tabel Master Supplier / Pemasok Barang';
COMMENT ON COLUMN public.master_supplier.id IS 'Primary Key UUID';
COMMENT ON COLUMN public.master_supplier.kode_supplier IS 'Kode unik supplier (contoh: SUP01, PT ABC)';
COMMENT ON COLUMN public.master_supplier.nama_supplier IS 'Nama perusahaan supplier';
COMMENT ON COLUMN public.master_supplier.alamat IS 'Alamat kantor supplier';
COMMENT ON COLUMN public.master_supplier.kota IS 'Kota supplier';
COMMENT ON COLUMN public.master_supplier.phone IS 'Nomor Telepon supplier';
COMMENT ON COLUMN public.master_supplier.contact_person IS 'Nama Contact Person / Sales Representative';
COMMENT ON COLUMN public.master_supplier.term IS 'Termin pembayaran (contoh: 30 Hari, COD)';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.master_supplier ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read Master Supplier untuk semua user" ON public.master_supplier FOR SELECT USING (true);
CREATE POLICY "Izinkan Insert Master Supplier untuk authenticated user" ON public.master_supplier FOR INSERT WITH CHECK (true);
CREATE POLICY "Izinkan Update Master Supplier untuk authenticated user" ON public.master_supplier FOR UPDATE USING (true);
CREATE POLICY "Izinkan Delete Master Supplier untuk authenticated user" ON public.master_supplier FOR DELETE USING (true);

-- 6. Trigger otomatis update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_supplier_updated_at ON public.master_supplier;
CREATE TRIGGER trigger_supplier_updated_at
BEFORE UPDATE ON public.master_supplier
FOR EACH ROW
EXECUTE FUNCTION public.handle_supplier_updated_at();

-- 7. Insert Data Contoh
INSERT INTO public.master_supplier (kode_supplier, nama_supplier, alamat, kota, phone, contact_person, term)
VALUES 
    ('SUP01', 'PT. GLOBAL JAYA ABADI', 'Jl. Industri Raya Blok C No. 8', 'JAKARTA UTARA', '021-6543210', 'Bpk. Andi', '30 Hari'),
    ('SUP02', 'CV. MAKMUR SEJAHTERA', 'Jl. Hayam Wuruk No. 15', 'JAKARTA PUSAT', '021-3456789', 'Ibu Siska', '14 Hari'),
    ('SUP03', 'PT. NUSANTARA DISTRIBUSI', 'Jl. Rungkut Industri No. 22', 'SURABAYA', '031-8765432', 'Bpk. Darmawan', '45 Hari')
ON CONFLICT (kode_supplier) DO UPDATE
SET nama_supplier = EXCLUDED.nama_supplier,
    alamat = EXCLUDED.alamat,
    kota = EXCLUDED.kota,
    phone = EXCLUDED.phone,
    contact_person = EXCLUDED.contact_person,
    term = EXCLUDED.term,
    updated_at = timezone('utc'::text, now());
