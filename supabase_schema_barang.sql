-- ============================================================
-- SQL Schema & Seed Data untuk Master Barang (Supabase / PostgreSQL)
-- ============================================================

-- 1. Buat Tabel Master Barang
CREATE TABLE IF NOT EXISTS public.master_barang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) NOT NULL UNIQUE,
    nama_barang VARCHAR(255) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    merk VARCHAR(100),
    category VARCHAR(100),
    tipe VARCHAR(100),
    stock NUMERIC(15, 2) DEFAULT 0.00,
    cost NUMERIC(15, 2) DEFAULT 0.00,
    price NUMERIC(15, 2) DEFAULT 0.00,
    disc NUMERIC(5, 2) DEFAULT 0.00,
    q_min NUMERIC(15, 2) DEFAULT 0.00,
    qty_po NUMERIC(15, 2) DEFAULT 0.00,
    qty_so NUMERIC(15, 2) DEFAULT 0.00,
    not_print BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index untuk optimasi pencarian berdasarkan Kode, Nama Barang, Merk, Category, dan Tipe
CREATE INDEX IF NOT EXISTS idx_barang_kode ON public.master_barang(kode);
CREATE INDEX IF NOT EXISTS idx_barang_nama ON public.master_barang(nama_barang);
CREATE INDEX IF NOT EXISTS idx_barang_merk ON public.master_barang(merk);
CREATE INDEX IF NOT EXISTS idx_barang_category ON public.master_barang(category);
CREATE INDEX IF NOT EXISTS idx_barang_tipe ON public.master_barang(tipe);

-- 3. Komentar Kolom & Tabel
COMMENT ON TABLE public.master_barang IS 'Tabel Master Item / Data Barang ERP';
COMMENT ON COLUMN public.master_barang.kode IS 'Kode Barang unik (contoh: 00000002, 00000003)';
COMMENT ON COLUMN public.master_barang.nama_barang IS 'Deskripsi / Nama lengkap barang';
COMMENT ON COLUMN public.master_barang.unit IS 'Satuan item (PCS, SET, UNIT, BOX)';
COMMENT ON COLUMN public.master_barang.merk IS 'Nama Merk / Brand barang';
COMMENT ON COLUMN public.master_barang.category IS 'Kategori barang (PRODUCT, SERVICES, dll)';
COMMENT ON COLUMN public.master_barang.tipe IS 'Tipe spesifik barang';
COMMENT ON COLUMN public.master_barang.stock IS 'Jumlah sisa stock fisik saat ini';
COMMENT ON COLUMN public.master_barang.cost IS 'Harga pokok pembelian (HPP)';
COMMENT ON COLUMN public.master_barang.price IS 'Harga jual standar';
COMMENT ON COLUMN public.master_barang.disc IS 'Diskon standar barang (%)';
COMMENT ON COLUMN public.master_barang.q_min IS 'Batas minimum kuantiti stock';
COMMENT ON COLUMN public.master_barang.qty_po IS 'Kuantiti barang sedang dipesan ke supplier (Purchase Order)';
COMMENT ON COLUMN public.master_barang.qty_so IS 'Kuantiti barang sedang dipesan oleh customer (Sales Order)';
COMMENT ON COLUMN public.master_barang.not_print IS 'Flag status cetak (true jika tidak dicetak)';

-- 4. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE public.master_barang ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses (RLS Policies)
CREATE POLICY "Izinkan Read untuk semua user" 
ON public.master_barang 
FOR SELECT 
USING (true);

CREATE POLICY "Izinkan Insert untuk authenticated user" 
ON public.master_barang 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Izinkan Update untuk authenticated user" 
ON public.master_barang 
FOR UPDATE 
USING (true);

CREATE POLICY "Izinkan Delete untuk authenticated user" 
ON public.master_barang 
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

DROP TRIGGER IF EXISTS trigger_barang_updated_at ON public.master_barang;
CREATE TRIGGER trigger_barang_updated_at
BEFORE UPDATE ON public.master_barang
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. Insert Data Awal (Sesuai Screenshot List Master Barang)
INSERT INTO public.master_barang (
    kode, nama_barang, unit, merk, category, tipe, stock, cost, price, disc, q_min, qty_po, qty_so, not_print
)
VALUES 
    ('00000002', 'MITUTOYO, 101120 CONTACT POINT', 'PCS', 'MITUTOYO', 'PRODUCT', 'CONTACT POINT', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000003', 'MITUTOYO, 111460 CONTACT POINT', 'PCS', 'MITUTOYO', 'PRODUCT', 'CONTACT POINT', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000004', 'MITUTOYO, 120047 CONTACT POINT', 'PCS', 'MITUTOYO', 'PRODUCT', 'CONTACT POINT', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000005', 'MITUTOYO, 120056 CONTACT POINT', 'PCS', 'MITUTOYO', 'PRODUCT', 'CONTACT POINT', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000006', 'MITUTOYO, 136.420 LIMIT SEAL (RED', 'PCS', 'MITUTOYO', 'PRODUCT', 'LIMIT SEAL', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000007', 'MITUTOYO, 136.421 LIMIT SEAL (GREEN', 'PCS', 'MITUTOYO', 'PRODUCT', 'LIMIT SEAL', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000008', 'MITUTOYO, 136.422 LIMIT SEAL', 'PCS', 'MITUTOYO', 'PRODUCT', 'LIMIT SEAL', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000009', 'MITUTOYO, 182-307 STEEL RULE', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000010', 'MITUTOYO, 188-102 PITCH GAGE,', 'SET', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000011', 'MITUTOYO, 172-116 STANDARD SCALE', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 1, 0, false),
    ('00000012', 'MITUTOYO, 172-118 READING SCALE F', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000013', 'MITUTOYO, 122-103 BLADE', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 2775000, 0, 0, 0, 0, false),
    ('00000014', 'MITUTOYO, 124-173 GEAR TOOTH', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000015', 'MITUTOYO, 500-444 DIGITAL CALIPER', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 3375000, 0, 0, 0, 0, false),
    ('00000016', 'MITUTOYO, 368-907 HOLETEST SET', 'SET', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000017', 'RUBERT, NO. 130 COMPOSITE SET OF', 'PCS', '', '', '', 0, 0, 0, 0, 0, 1, 0, false),
    ('00000018', 'IMADA, KV-50N (SUCCESOR MODEL OF', 'PCS', '', '', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000019', 'MITUTOYO, 527-102 VERNIER DEPTH', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 2275000, 0, 0, 0, 0, false),
    ('00000020', 'MITUTOYO, 21AAA352 BALL POINT', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000021', 'MITUTOYO, 303613 EXTENSION ROD', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000022', 'MITUTOYO, 7321-B DIAL THICKNESS', 'PCS', 'MITUTOYO', 'PRODUCT', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000023', 'IMADA, HV-500N II STAND', 'PCS', '', '', '', 0, 0, 0, 0, 0, 3, 0, false),
    ('00000024', 'MITUTOYO, 103011 CONTACT POINT', 'PCS', 'MITUTOYO', 'PRODUCT', 'CONTACT POINT', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000025', 'AIR BOSS AB-1800 AIR IMPACT WRENCH', 'UNIT', '', '', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000026', 'AIR BOSS AB-1900P AIR IMPACT', 'UNIT', '', '', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000027', 'AIR BOSS AB-6PPH AIR SCREWDRIVER', 'UNIT', '', '', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000028', 'AIR BOSS AB-8SD AIR SCREWDRIVER', 'UNIT', '', '', '', 0, 0, 0, 0, 0, 0, 0, false),
    ('00000029', 'AIR BOSS AB-5602GL AIR IMPACT', 'UNIT', '', '', '', 0, 0, 0, 0, 0, 0, 0, false)
ON CONFLICT (kode) DO NOTHING;
