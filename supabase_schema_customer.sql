-- ============================================================
-- SQL Schema & Seed Data untuk Master Customer (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Master Customer
CREATE TABLE IF NOT EXISTS public.master_customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_customer VARCHAR(50) NOT NULL UNIQUE,
    nama_customer VARCHAR(150) NOT NULL,
    alamat TEXT,
    kota VARCHAR(100),
    phone VARCHAR(50),
    contact_person VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    wilayah VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian
CREATE INDEX IF NOT EXISTS idx_customer_kode ON public.master_customer(kode_customer);
CREATE INDEX IF NOT EXISTS idx_customer_nama ON public.master_customer(nama_customer);

-- 3. Komentar Tabel dan Kolom
COMMENT ON TABLE public.master_customer IS 'Tabel Master Customer / Pelanggan';
COMMENT ON COLUMN public.master_customer.id IS 'Primary Key UUID';
COMMENT ON COLUMN public.master_customer.kode_customer IS 'Kode unik customer (contoh: CUST01, TOKO BERKAH)';
COMMENT ON COLUMN public.master_customer.nama_customer IS 'Nama toko / perusahaan customer';
COMMENT ON COLUMN public.master_customer.alamat IS 'Alamat pengiriman / toko';
COMMENT ON COLUMN public.master_customer.kota IS 'Kota customer';
COMMENT ON COLUMN public.master_customer.phone IS 'Nomor Telepon customer';
COMMENT ON COLUMN public.master_customer.contact_person IS 'Nama pemilik / PIC toko';
COMMENT ON COLUMN public.master_customer.credit_limit IS 'Batas plafon kredit piutang';
COMMENT ON COLUMN public.master_customer.wilayah IS 'Wilayah / Area cakupan';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.master_customer ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read Master Customer untuk semua user" ON public.master_customer FOR SELECT USING (true);
CREATE POLICY "Izinkan Insert Master Customer untuk authenticated user" ON public.master_customer FOR INSERT WITH CHECK (true);
CREATE POLICY "Izinkan Update Master Customer untuk authenticated user" ON public.master_customer FOR UPDATE USING (true);
CREATE POLICY "Izinkan Delete Master Customer untuk authenticated user" ON public.master_customer FOR DELETE USING (true);

-- 6. Trigger otomatis update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_customer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_updated_at ON public.master_customer;
CREATE TRIGGER trigger_customer_updated_at
BEFORE UPDATE ON public.master_customer
FOR EACH ROW
EXECUTE FUNCTION public.handle_customer_updated_at();

-- 7. Insert Data Contoh
INSERT INTO public.master_customer (kode_customer, nama_customer, alamat, kota, phone, contact_person, credit_limit, wilayah)
VALUES 
    ('CUST01', 'TOKO BERKAH JAYA', 'Jl. Perniagaan Timur No. 14', 'JAKARTA BARAT', '021-6677889', 'Bpk. Ali', 50000000.00, 'JAKARTA'),
    ('CUST02', 'TB. SUMBER MAKMUR', 'Jl. Braga No. 88', 'BANDUNG', '022-4201122', 'Ibu Rina', 25000000.00, 'BANDUNG - JABAR'),
    ('CUST03', 'UD. SINAR TERANG', 'Jl. Gajah Mada No. 45', 'SURABAYA', '031-5341234', 'Bpk. Hartono', 75000000.00, 'SURABAYA - JATIM')
ON CONFLICT (kode_customer) DO UPDATE
SET nama_customer = EXCLUDED.nama_customer,
    alamat = EXCLUDED.alamat,
    kota = EXCLUDED.kota,
    phone = EXCLUDED.phone,
    contact_person = EXCLUDED.contact_person,
    credit_limit = EXCLUDED.credit_limit,
    wilayah = EXCLUDED.wilayah,
    updated_at = timezone('utc'::text, now());
