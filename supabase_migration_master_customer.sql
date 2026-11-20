-- Migration SQL untuk menambahkan kolom baru ke tabel master_customers di Supabase
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS ppn BOOLEAN DEFAULT true;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS hitung BOOLEAN DEFAULT true;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS npwp TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS alamat_npwp TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS wilayah TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS limit_kredit NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS tmp_pembayaran INT DEFAULT 0;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS rubah_kode TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS kode_sales TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS nama_sales TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS kode_expedisi TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS nama_expedisi TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS contact_nama TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS handphone TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS inv_alamat TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS inv_kota TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS inv_telepon TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS inv_fax TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS del_alamat TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS del_kota TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS del_telepon TEXT;
ALTER TABLE public.master_customers ADD COLUMN IF NOT EXISTS del_fax TEXT;

NOTIFY pgrst, 'reload schema';
