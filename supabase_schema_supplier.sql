-- ============================================================
-- SQL Schema & Update untuk Master Supplier (Supabase / PostgreSQL)
-- Menambahkan kolom Contact Person, Email, Website pada master_suppliers
-- ============================================================

-- 1. Pastikan tabel master_suppliers dan seluruh kolom tersedia
CREATE TABLE IF NOT EXISTS public.master_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_supplier VARCHAR(50) NOT NULL UNIQUE,
    nama_supplier VARCHAR(150) NOT NULL,
    hutang NUMERIC(18,2) DEFAULT 0,
    hutang_giro NUMERIC(18,2) DEFAULT 0,
    alamat TEXT,
    kota VARCHAR(100),
    telepon VARCHAR(50),
    contact_person VARCHAR(150),
    email VARCHAR(150),
    website VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tambahkan kolom baru jika tabel master_suppliers sudah ada sebelumnya
ALTER TABLE public.master_suppliers
    ADD COLUMN IF NOT EXISTS hutang NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hutang_giro NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS alamat TEXT,
    ADD COLUMN IF NOT EXISTS kota VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telepon VARCHAR(50),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150),
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS website VARCHAR(200);

-- 3. Index untuk mempercepat fitur FIND & SEARCH
CREATE INDEX IF NOT EXISTS idx_master_suppliers_kode ON public.master_suppliers(kode_supplier);
CREATE INDEX IF NOT EXISTS idx_master_suppliers_nama ON public.master_suppliers(nama_supplier);
CREATE INDEX IF NOT EXISTS idx_master_suppliers_kota ON public.master_suppliers(kota);
CREATE INDEX IF NOT EXISTS idx_master_suppliers_contact_person ON public.master_suppliers(contact_person);
CREATE INDEX IF NOT EXISTS idx_master_suppliers_email ON public.master_suppliers(email);

-- 4. Aktifkan Row Level Security (RLS) & Kebijakan Akses
ALTER TABLE public.master_suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_suppliers' AND policyname = 'Allow all access master_suppliers'
    ) THEN
        CREATE POLICY "Allow all access master_suppliers"
            ON public.master_suppliers FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Trigger otomatis update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_supplier_updated_at ON public.master_suppliers;
CREATE TRIGGER trigger_supplier_updated_at
BEFORE UPDATE ON public.master_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.handle_supplier_updated_at();

-- 6. Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';
