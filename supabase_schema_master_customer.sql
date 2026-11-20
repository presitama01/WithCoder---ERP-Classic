-- Schema update for master_customers in Supabase

CREATE TABLE IF NOT EXISTS public.master_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_customer TEXT NOT NULL UNIQUE,
  nama_customer TEXT NOT NULL,
  ppn BOOLEAN DEFAULT true,
  hitung BOOLEAN DEFAULT true,
  npwp TEXT,
  alamat_npwp TEXT,
  wilayah TEXT,
  limit_kredit NUMERIC(15,2) DEFAULT 0,
  tmp_pembayaran INT DEFAULT 0,
  rubah_kode TEXT,
  kode_sales TEXT,
  nama_sales TEXT,
  kode_expedisi TEXT,
  nama_expedisi TEXT,
  contact_nama TEXT,
  email TEXT,
  handphone TEXT,
  inv_alamat TEXT,
  inv_kota TEXT,
  inv_telepon TEXT,
  inv_fax TEXT,
  del_alamat TEXT,
  del_kota TEXT,
  del_telepon TEXT,
  del_fax TEXT,
  piutang NUMERIC(15,2) DEFAULT 0,
  piutang_giro NUMERIC(15,2) DEFAULT 0,
  alamat TEXT,
  kota TEXT,
  phone TEXT,
  group_area TEXT,
  sales TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.master_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for master_customers" ON public.master_customers FOR ALL USING (true) WITH CHECK (true);
