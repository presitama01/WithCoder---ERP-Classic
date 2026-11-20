-- ============================================================
-- SQL Schema & Update untuk List Purchase Order, Koneksi No.PR,
-- dan Potongan Persen PPN pada P.O. Detail
-- (Supabase / PostgreSQL)
-- ============================================================

-- 1. Pastikan tabel purchase_orders dan seluruh kolom barunya tersedia
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_bukti VARCHAR(100) NOT NULL UNIQUE,
    no_pr VARCHAR(100),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nama_supplier VARCHAR(255) NOT NULL,
    delivery_to VARCHAR(255),
    delivery VARCHAR(100),
    mata_uang VARCHAR(20) DEFAULT 'IDR',
    keterangan TEXT,
    nilai_po NUMERIC(18,2) DEFAULT 0,
    ppn NUMERIC(8,2) DEFAULT 11,
    nilai_ppn NUMERIC(18,2) DEFAULT 0,
    deposit NUMERIC(18,2) DEFAULT 0,
    tgl_lunas DATE,
    tgl_kirim DATE,
    persen NUMERIC(8,2) DEFAULT 0,
    po_close VARCHAR(30) DEFAULT 'Not Yet',
    dibuat_oleh VARCHAR(100) DEFAULT 'ADMIN',
    tgl_created DATE DEFAULT CURRENT_DATE,
    diupdate_oleh VARCHAR(100) DEFAULT '-',
    tgl_update DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS no_pr VARCHAR(100),
    ADD COLUMN IF NOT EXISTS delivery_to VARCHAR(255),
    ADD COLUMN IF NOT EXISTS delivery VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mata_uang VARCHAR(20) DEFAULT 'IDR',
    ADD COLUMN IF NOT EXISTS keterangan TEXT,
    ADD COLUMN IF NOT EXISTS nilai_po NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ppn NUMERIC(8,2) DEFAULT 11,
    ADD COLUMN IF NOT EXISTS nilai_ppn NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tgl_lunas DATE,
    ADD COLUMN IF NOT EXISTS tgl_kirim DATE,
    ADD COLUMN IF NOT EXISTS persen NUMERIC(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS po_close VARCHAR(30) DEFAULT 'Not Yet';

-- 2. Pastikan tabel purchase_order_details tersedia
CREATE TABLE IF NOT EXISTS public.purchase_order_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
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

-- 3. (Opsional) Sinkronkan data PO lama yang sudah punya P.O. Detail agar nilai_ppn & nilai_po terpotong PPN
UPDATE public.purchase_orders po
SET
    nilai_ppn = ROUND((det.total_detail * COALESCE(po.ppn, 0)) / 100.0, 2),
    nilai_po  = GREATEST(0, ROUND(det.total_detail - ((det.total_detail * COALESCE(po.ppn, 0)) / 100.0), 2))
FROM (
    SELECT po_id, COALESCE(SUM(total), 0) AS total_detail
    FROM public.purchase_order_details
    GROUP BY po_id
) det
WHERE po.id = det.po_id
  AND det.total_detail > 0
  AND COALESCE(po.nilai_ppn, 0) = 0;

-- 4. Index untuk mempercepat relasi No.PR serta fitur FIND & SEARCH pada Purchase Order
CREATE INDEX IF NOT EXISTS idx_purchase_orders_no_bukti ON public.purchase_orders(no_bukti);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_no_pr ON public.purchase_orders(no_pr);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(nama_supplier);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_to ON public.purchase_orders(delivery_to);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tanggal ON public.purchase_orders(tanggal);
CREATE INDEX IF NOT EXISTS idx_purchase_order_details_po_id ON public.purchase_order_details(po_id);

-- 5. Aktifkan RLS & Kebijakan Akses
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_details ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Allow all access purchase_orders'
    ) THEN
        CREATE POLICY "Allow all access purchase_orders"
            ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_details' AND policyname = 'Allow all access purchase_order_details'
    ) THEN
        CREATE POLICY "Allow all access purchase_order_details"
            ON public.purchase_order_details FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';
