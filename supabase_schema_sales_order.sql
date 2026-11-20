-- ============================================================
-- SQL Schema & Update untuk Sales Order (Potongan PPN & Nominal PPN)
-- (Supabase / PostgreSQL)
-- ============================================================

-- 1. Pastikan tabel sales_orders dan kolom nilai_ppn tersedia
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_bukti VARCHAR(100) NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nama_customer VARCHAR(255) NOT NULL,
    sales VARCHAR(100),
    po_no VARCHAR(100),
    nilai_so NUMERIC(18,2) DEFAULT 0,
    deposit NUMERIC(18,2) DEFAULT 0,
    tgl_kirim DATE,
    persen NUMERIC(8,2) DEFAULT 0,
    keterangan TEXT,
    ppn NUMERIC(8,2) DEFAULT 11,
    nilai_ppn NUMERIC(18,2) DEFAULT 0,
    so_close VARCHAR(30) DEFAULT 'Not Yet',
    lokasi_stock VARCHAR(120) DEFAULT '01 - OFFICE',
    dibuat_oleh VARCHAR(100) DEFAULT 'ADMIN',
    tgl_created DATE DEFAULT CURRENT_DATE,
    diupdate_oleh VARCHAR(100) DEFAULT '-',
    tgl_update DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sales_orders
    ADD COLUMN IF NOT EXISTS ppn NUMERIC(8,2) DEFAULT 11,
    ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nilai_so NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tgl_kirim DATE,
    ADD COLUMN IF NOT EXISTS persen NUMERIC(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS keterangan TEXT,
    ADD COLUMN IF NOT EXISTS so_close VARCHAR(30) DEFAULT 'Not Yet',
    ADD COLUMN IF NOT EXISTS lokasi_stock VARCHAR(120) DEFAULT '01 - OFFICE';

-- 2. Pastikan tabel sales_order_details tersedia
CREATE TABLE IF NOT EXISTS public.sales_order_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    so_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    no_bukti VARCHAR(100),
    no_urut INTEGER NOT NULL DEFAULT 1,
    kode VARCHAR(100) NOT NULL,
    nama_barang VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'PCS',
    terima NUMERIC(18,2) DEFAULT 0,
    qty NUMERIC(18,2) DEFAULT 1,
    harga NUMERIC(18,2) DEFAULT 0,
    jumlah NUMERIC(18,2) DEFAULT 0,
    total NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. (Opsional) Sinkronkan data lama yang sudah punya S.O. Detail agar nilai_ppn & nilai_so terpotong PPN
UPDATE public.sales_orders so
SET
    nilai_ppn = ROUND((det.total_detail * COALESCE(so.ppn, 0)) / 100.0, 2),
    nilai_so  = GREATEST(0, ROUND(det.total_detail - ((det.total_detail * COALESCE(so.ppn, 0)) / 100.0), 2))
FROM (
    SELECT so_id, COALESCE(SUM(total), 0) AS total_detail
    FROM public.sales_order_details
    GROUP BY so_id
) det
WHERE so.id = det.so_id
  AND det.total_detail > 0
  AND COALESCE(so.nilai_ppn, 0) = 0;

-- 4. Index untuk mempercepat fitur FIND & SEARCH pada tabel sales_orders & sales_order_details
CREATE INDEX IF NOT EXISTS idx_sales_orders_no_bukti ON public.sales_orders(no_bukti);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(nama_customer);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales ON public.sales_orders(sales);
CREATE INDEX IF NOT EXISTS idx_sales_orders_po_no ON public.sales_orders(po_no);
CREATE INDEX IF NOT EXISTS idx_sales_orders_lokasi_stock ON public.sales_orders(lokasi_stock);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tanggal ON public.sales_orders(tanggal);
CREATE INDEX IF NOT EXISTS idx_sales_order_details_so_id ON public.sales_order_details(so_id);

-- 5. Aktifkan RLS & Kebijakan Akses
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_details ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sales_orders' AND policyname = 'Allow all access sales_orders'
    ) THEN
        CREATE POLICY "Allow all access sales_orders"
            ON public.sales_orders FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sales_order_details' AND policyname = 'Allow all access sales_order_details'
    ) THEN
        CREATE POLICY "Allow all access sales_order_details"
            ON public.sales_order_details FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';
