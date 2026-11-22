-- ============================================================================
-- SQL MIGRATION: PENINGKATAN & INTEGRASI 12 FORM MASTER ERP
-- (Company Profile, Category, Merk, Tipe, Barang, Bank, Wilayah, Lokasi Gudang,
--  Expedisi, Sales, Supplier, Customer)
-- Jalankan script ini pada Supabase SQL Editor
-- ============================================================================

-- 1. Company Profile: Logo URL untuk Kop Surat Print Preview
ALTER TABLE IF EXISTS public.company_profiles
    ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';

-- 2. Master Barang: Status Aktif & pastikan kolom standar tersedia
ALTER TABLE IF EXISTS public.master_barangs
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_master_barangs_kode ON public.master_barangs(kode);
CREATE INDEX IF NOT EXISTS idx_master_barangs_category ON public.master_barangs(category);
CREATE INDEX IF NOT EXISTS idx_master_barangs_merk ON public.master_barangs(merk);
CREATE INDEX IF NOT EXISTS idx_master_barangs_tipe ON public.master_barangs(tipe);

-- 3. Master Bank: Mata Uang, Jenis Rekening, Saldo Awal, Status Aktif
ALTER TABLE IF EXISTS public.master_banks
    ADD COLUMN IF NOT EXISTS mata_uang VARCHAR(15) DEFAULT 'IDR',
    ADD COLUMN IF NOT EXISTS jenis_rekening VARCHAR(30) DEFAULT 'OPERASIONAL',
    ADD COLUMN IF NOT EXISTS saldo_awal NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Master Lokasi Gudang: Gudang Utama (Default) & Status Aktif
ALTER TABLE IF EXISTS public.master_lokasi_gudangs
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. Master Expedisi: Contact Person, Email, Armada/No.Pol, Keterangan, Status Aktif
ALTER TABLE IF EXISTS public.master_expedisis
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150) DEFAULT '',
    ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT '',
    ADD COLUMN IF NOT EXISTS armada VARCHAR(120) DEFAULT '',
    ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_master_expedisis_kode ON public.master_expedisis(kode_expedisi);

-- 6. Master Sales: Wilayah Tugas & Status Aktif
ALTER TABLE IF EXISTS public.master_sales
    ADD COLUMN IF NOT EXISTS wilayah VARCHAR(150) DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_master_sales_wilayah ON public.master_sales(wilayah);

-- 7. Master Supplier: NPWP, Tempo Pembayaran (Hari), No. Rekening, Mata Uang, Status Aktif
ALTER TABLE IF EXISTS public.master_suppliers
    ADD COLUMN IF NOT EXISTS npwp VARCHAR(60) DEFAULT '',
    ADD COLUMN IF NOT EXISTS tmp_pembayaran INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS no_rekening VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS mata_uang VARCHAR(15) DEFAULT 'IDR',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_master_suppliers_npwp ON public.master_suppliers(npwp);

-- 8. Master Customer: Piutang, Piutang Giro, dan Status Aktif
ALTER TABLE IF EXISTS public.master_customers
    ADD COLUMN IF NOT EXISTS piutang NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS piutang_giro NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_master_customers_wilayah ON public.master_customers(wilayah);
CREATE INDEX IF NOT EXISTS idx_master_customers_sales ON public.master_customers(kode_sales);
CREATE INDEX IF NOT EXISTS idx_master_customers_expedisi ON public.master_customers(kode_expedisi);

-- 9. Refresh PostgREST schema cache Supabase
NOTIFY pgrst, 'reload schema';
