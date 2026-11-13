import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WithCoder ERP] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const ALLOWED_TABLES = new Set([
  'app_users',
  'app_settings',
  'company_profiles',
  'master_categories',
  'master_merks',
  'master_types',
  'master_barangs',
  'master_banks',
  'master_wilayahs',
  'master_lokasi_gudangs',
  'master_expedisis',
  'master_sales',
  'master_suppliers',
  'master_customers',
  'giro_pembelian_headers',
  'giro_pembelian_details',
  'purchase_requests',
  'purchase_orders',
  'pembelian_barangs',
  'retur_pembelians',
  'giro_penjualan_headers',
  'giro_penjualan_details',
  'sales_inquiries',
  'sales_quotations',
  'sales_orders',
  'sales_order_items',
  'surat_jalans',
  'surat_jalan_items',
  'faktur_penjualans',
  'retur_penjualans',
  'stock_awal',
  'penerimaan_barang_lains',
  'pengeluaran_barang_lains',
  'hpp_pembelians',
  'jurnal_umums',
  'jurnal_umum_details',
]);

const ALLOWED_VIEWS = new Set([
  'v_mutasi_sales_order',
  'v_laporan_penjualan_barang',
  'v_laporan_surat_jalan',
  'v_laporan_kertas_kerja',
]);

function isReadableResource(name: string): boolean {
  return ALLOWED_TABLES.has(name) || ALLOWED_VIEWS.has(name);
}

function isWritableTable(name: string): boolean {
  return ALLOWED_TABLES.has(name);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Health check verifying live Supabase connection
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('id, profile_code, company_name')
        .limit(1);

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
      return res.json({ ok: true, connected: true, sample: data?.[0] || null });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
    }
  });

  // Composite endpoints for Master-Detail transactions
  app.post('/api/erp/composite/giro-pembelian', async (req: Request, res: Response) => {
    try {
      const { header, details } = req.body as {
        header: Record<string, any>;
        details: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('giro_pembelian_headers')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('giro_pembelian_details')
          .delete()
          .eq('header_id', id);
        if (delErr) return res.status(400).json({ error: delErr.message });
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('giro_pembelian_headers')
          .upsert(insertHeader, { onConflict: 'no_bukti' })
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        await supabase
          .from('giro_pembelian_details')
          .delete()
          .eq('header_id', headerRow.id);
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, ...rest } = d;
          return {
            ...rest,
            header_id: headerRow.id,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('giro_pembelian_details')
          .insert(payload)
          .select();
        if (detErr) return res.status(400).json({ error: detErr.message });
        savedDetails = detData || [];
      }

      return res.json({ header: headerRow, details: savedDetails });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan giro pembelian.' });
    }
  });

  app.post('/api/erp/composite/giro-penjualan', async (req: Request, res: Response) => {
    try {
      const { header, details } = req.body as {
        header: Record<string, any>;
        details: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('giro_penjualan_headers')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('giro_penjualan_details')
          .delete()
          .eq('header_id', id);
        if (delErr) return res.status(400).json({ error: delErr.message });
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('giro_penjualan_headers')
          .upsert(insertHeader, { onConflict: 'no_bukti' })
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        await supabase
          .from('giro_penjualan_details')
          .delete()
          .eq('header_id', headerRow.id);
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, ...rest } = d;
          return {
            ...rest,
            header_id: headerRow.id,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('giro_penjualan_details')
          .insert(payload)
          .select();
        if (detErr) return res.status(400).json({ error: detErr.message });
        savedDetails = detData || [];
      }

      return res.json({ header: headerRow, details: savedDetails });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan giro penjualan.' });
    }
  });

  app.post('/api/erp/composite/jurnal-umum', async (req: Request, res: Response) => {
    try {
      const { header, details } = req.body as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti Jurnal wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('jurnal_umums')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('jurnal_umums')
          .upsert(insertHeader, { onConflict: 'no_bukti' })
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      if (Array.isArray(details)) {
        await supabase.from('jurnal_umum_details').delete().eq('jurnal_id', headerRow.id);
        if (details.length > 0) {
          const payload = details.map((d) => {
            const { id: _id, created_at: _c, ...rest } = d;
            return { ...rest, jurnal_id: headerRow.id };
          });
          const { error: detErr } = await supabase.from('jurnal_umum_details').insert(payload);
          if (detErr) return res.status(400).json({ error: detErr.message });
        }
      }

      return res.json({ header: headerRow });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan jurnal umum.' });
    }
  });

  // Generic READ endpoint for all tables and views
  app.get('/api/erp/:table', async (req: Request, res: Response) => {
    const table = req.params.table;
    if (!isReadableResource(table)) {
      return res.status(400).json({ error: `Resource '${table}' tidak diizinkan.` });
    }

    try {
      const selectCols = (req.query.select as string) || '*';
      let query = supabase.from(table).select(selectCols);

      // Apply exact, gte, lte, and ilike filters from query string
      for (const [key, rawVal] of Object.entries(req.query)) {
        if (rawVal === undefined || rawVal === '' || rawVal === null) continue;
        const val = String(rawVal);

        if (key.startsWith('eq_')) {
          query = query.eq(key.slice(3), val);
        } else if (key.startsWith('gte_')) {
          query = query.gte(key.slice(4), val);
        } else if (key.startsWith('lte_')) {
          query = query.lte(key.slice(4), val);
        } else if (key.startsWith('ilike_')) {
          query = query.ilike(key.slice(6), `%${val}%`);
        }
      }

      const searchCol = req.query.searchCol as string | undefined;
      const searchVal = req.query.searchVal as string | undefined;
      if (searchCol && searchVal) {
        query = query.ilike(searchCol, `%${searchVal}%`);
      }

      const orderBy = req.query.orderBy as string | undefined;
      const asc = req.query.asc !== 'false';
      if (orderBy) {
        query = query.order(orderBy, { ascending: asc });
      }

      const limit = Number(req.query.limit || 1000);
      query = query.limit(Math.min(limit, 5000));

      const { data, error } = await query;
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({ data: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error saat membaca data.' });
    }
  });

  // Generic INSERT endpoint
  app.post('/api/erp/:table', async (req: Request, res: Response) => {
    const table = req.params.table;
    if (!isWritableTable(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak mendukung penulisan.` });
    }

    try {
      const body = req.body;
      const sanitizeRow = (row: Record<string, any>) => {
        const copy = { ...row };
        if (!copy.id) delete copy.id;
        delete copy.created_at;
        delete copy.updated_at;
        return copy;
      };
      const payload = Array.isArray(body) ? body.map(sanitizeRow) : sanitizeRow(body);

      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({ data: Array.isArray(body) ? data : data?.[0] || null });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error saat menyimpan data.' });
    }
  });

  // Generic UPSERT endpoint
  app.post('/api/erp/:table/upsert', async (req: Request, res: Response) => {
    const table = req.params.table;
    if (!isWritableTable(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak mendukung upsert.` });
    }

    try {
      const onConflict = req.query.onConflict ? String(req.query.onConflict) : undefined;
      const body = req.body;
      const sanitizeRow = (row: Record<string, any>) => {
        const copy = { ...row };
        if (!copy.id) delete copy.id;
        delete copy.created_at;
        delete copy.updated_at;
        return copy;
      };
      const payload = Array.isArray(body) ? body.map(sanitizeRow) : sanitizeRow(body);

      const { data, error } = await supabase
        .from(table)
        .upsert(payload, onConflict ? { onConflict } : undefined)
        .select();
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({ data: Array.isArray(body) ? data : data?.[0] || null });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error saat upsert data.' });
    }
  });

  // Generic UPDATE endpoint
  app.patch('/api/erp/:table/:id', async (req: Request, res: Response) => {
    const table = req.params.table;
    const id = req.params.id;
    const matchCol = (req.query.matchCol as string) || 'id';

    if (!isWritableTable(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak mendukung pembaruan.` });
    }

    try {
      const copy = { ...req.body };
      delete copy.id;
      delete copy.created_at;
      delete copy.updated_at;

      const { data, error } = await supabase
        .from(table)
        .update(copy)
        .eq(matchCol, id)
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({ data: data?.[0] || null });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error saat memperbarui data.' });
    }
  });

  // Generic DELETE endpoint
  app.delete('/api/erp/:table/:id', async (req: Request, res: Response) => {
    const table = req.params.table;
    const id = req.params.id;
    const matchCol = (req.query.matchCol as string) || 'id';

    if (!isWritableTable(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak mendukung penghapusan.` });
    }

    try {
      const { error } = await supabase.from(table).delete().eq(matchCol, id);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error saat menghapus data.' });
    }
  });

  // Catch-all 404 for any unmatched /api route to ensure it always returns JSON, never HTML
  app.all('/api/*', (req: Request, res: Response) => {
    return res.status(404).json({
      error: `API endpoint '${req.method} ${req.path}' tidak ditemukan.`,
    });
  });

  // Global error handler for API
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('[WithCoder ERP API Error]', err);
    return res.status(500).json({
      error: err?.message || 'Internal Server Error pada server ERP.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WithCoder ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
