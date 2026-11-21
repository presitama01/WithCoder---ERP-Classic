import 'dotenv/config';
import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
  'giro_pembelian',
  'giro_pembelians',
  'purchase_requests',
  'purchase_orders',
  'purchase_order_details',
  'pembelian_barangs',
  'pembelian_barang_details',
  'retur_pembelians',
  'retur_pembelian_details',
  'giro_penjualan_headers',
  'giro_penjualan_details',
  'giro_penjualan',
  'giro_penjualans',
  'sales_inquiries',
  'sales_quotations',
  'sales_quotation_details',
  'sales_orders',
  'sales_order_details',
  'sales_order_items',
  'surat_jalans',
  'surat_jalan_details',
  'surat_jalan_items',
  'faktur_penjualans',
  'faktur_penjualan_details',
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

let cachedSupabase: SupabaseClient | null = null;
let cachedEnvSignature = '';

function getSupabaseClient(): { client: SupabaseClient | null; missingEnv: boolean } {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceKey) {
    return { client: null, missingEnv: true };
  }

  const signature = `${url}|${serviceKey}`;
  if (!cachedSupabase || cachedEnvSignature !== signature) {
    cachedSupabase = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedEnvSignature = signature;
  }

  return { client: cachedSupabase, missingEnv: false };
}

function getMissingEnvMessage(): string {
  return 'Konfigurasi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diatur pada Environment Variables server.';
}

export function registerErpApiRoutes(app: Express): void {
  const jsonParser = express.json({ limit: '5mb' });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body !== undefined && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return next();
    }
    return jsonParser(req, res, next);
  });

  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Health check verifying live Supabase connection
  app.get('/api/health', async (_req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ ok: false, error: getMissingEnvMessage() });
    }

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
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
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
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
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
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
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

  app.post('/api/erp/composite/purchase-order', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti Purchase Order wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('purchase_orders')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('purchase_order_details')
          .delete()
          .eq('po_id', id);
        if (delErr) return res.status(400).json({ error: delErr.message });
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert(insertHeader)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, updated_at: _u, ...rest } = d;
          return {
            ...rest,
            po_id: headerRow.id,
            no_bukti: headerRow.no_bukti,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('purchase_order_details')
          .insert(payload)
          .select();
        if (detErr) return res.status(400).json({ error: detErr.message });
        savedDetails = detData || [];
      }

      if (
        headerRow?.no_bukti &&
        header.no_pr &&
        String(header.no_pr).trim() &&
        String(header.no_pr).trim() !== '-'
      ) {
        try {
          await supabase
            .from('purchase_requests')
            .update({ no_po: headerRow.no_bukti })
            .eq('no_pr', String(header.no_pr).trim().toUpperCase());
        } catch {
          // Non-fatal sync
        }
      }

      return res.json({ header: headerRow, details: savedDetails });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Purchase Order.' });
    }
  });

  app.post('/api/erp/composite/pembelian', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti Pembelian wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('pembelian_barangs')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('pembelian_barang_details')
          .delete()
          .eq('pembelian_id', id);
        if (delErr && (!Array.isArray(details) || details.length > 0)) {
          return res.status(400).json({ error: delErr.message });
        }
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('pembelian_barangs')
          .insert(insertHeader)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, ...rest } = d;
          return {
            ...rest,
            pembelian_id: headerRow.id,
            no_bukti: headerRow.no_bukti,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('pembelian_barang_details')
          .insert(payload)
          .select();
        if (detErr) return res.status(400).json({ error: detErr.message });
        savedDetails = detData || [];
      }

      return res.json({ header: headerRow, details: savedDetails });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Pembelian Barang.' });
    }
  });

  app.post('/api/erp/composite/retur-pembelian', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti Retur Pembelian wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('retur_pembelians')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('retur_pembelian_details')
          .delete()
          .eq('retur_id', id);
        if (delErr && (!Array.isArray(details) || details.length > 0)) {
          return res.status(400).json({ error: delErr.message });
        }
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('retur_pembelians')
          .insert(insertHeader)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, ...rest } = d;
          return {
            ...rest,
            retur_id: headerRow.id,
            no_bukti: headerRow.no_bukti,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('retur_pembelian_details')
          .insert(payload)
          .select();
        if (detErr) return res.status(400).json({ error: detErr.message });
        savedDetails = detData || [];
      }

      return res.json({ header: headerRow, details: savedDetails });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Retur Pembelian.' });
    }
  });

  app.post('/api/erp/composite/sales-quotation', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_sq) {
        return res.status(400).json({ error: 'No. SQ wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('sales_quotations')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('sales_quotation_details')
          .delete()
          .eq('sq_id', id);
        if (delErr && (!Array.isArray(details) || details.length > 0)) {
          return res.status(400).json({ error: delErr.message });
        }
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('sales_quotations')
          .insert(insertHeader)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, updated_at: _u, ...rest } = d;
          return {
            ...rest,
            sq_id: headerRow.id,
            no_sq: headerRow.no_sq,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('sales_quotation_details')
          .insert(payload)
          .select();
        if (detErr) return res.status(400).json({ error: detErr.message });
        savedDetails = detData || [];
      }

      return res.json({ header: headerRow, details: savedDetails });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Sales Quotation.' });
    }
  });

  app.post('/api/erp/composite/sales-order', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti Sales Order wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('sales_orders')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('sales_order_details')
          .delete()
          .eq('so_id', id);
        if (delErr && (!Array.isArray(details) || details.length > 0)) {
          return res.status(400).json({ error: delErr.message });
        }
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('sales_orders')
          .insert(insertHeader)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, updated_at: _u, ...rest } = d;
          return {
            ...rest,
            so_id: headerRow.id,
            no_bukti: headerRow.no_bukti,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('sales_order_details')
          .insert(payload)
          .select();
        if (detErr) return res.status(400).json({ error: detErr.message });
        savedDetails = detData || [];
      }

      return res.json({ header: headerRow, details: savedDetails });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Sales Order.' });
    }
  });

  app.post('/api/erp/composite/faktur-penjualan', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti Faktur Penjualan wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('faktur_penjualans')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('faktur_penjualan_details')
          .delete()
          .eq('faktur_id', id);
        if (delErr) {
          const msg = String(delErr.message || '').toLowerCase();
          const isMissingTable = msg.includes('faktur_penjualan_details') || msg.includes('schema cache') || msg.includes('does not exist');
          if (!isMissingTable && (!Array.isArray(details) || details.length > 0)) {
            return res.status(400).json({ error: delErr.message });
          }
        }
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('faktur_penjualans')
          .insert(insertHeader)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      let savedDetails: any[] = [];
      let detailWarning: string | undefined;
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, updated_at: _u, ...rest } = d;
          return {
            ...rest,
            faktur_id: headerRow.id,
            no_bukti: headerRow.no_bukti,
            no_so: headerRow.no_so || d.no_so || '',
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('faktur_penjualan_details')
          .insert(payload)
          .select();
        if (detErr) {
          const msg = String(detErr.message || '').toLowerCase();
          const isMissingTable = msg.includes('faktur_penjualan_details') || msg.includes('schema cache') || msg.includes('does not exist');
          if (isMissingTable) {
            detailWarning = 'Tabel faktur_penjualan_details belum dibuat di Supabase. Jalankan SQL Query terlebih dahulu.';
          } else {
            return res.status(400).json({ error: detErr.message });
          }
        } else {
          savedDetails = detData || [];
        }
      }

      return res.json({ header: headerRow, details: savedDetails, detailWarning });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Faktur Penjualan.' });
    }
  });

  app.post('/api/erp/composite/surat-jalan', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_bukti) {
        return res.status(400).json({ error: 'No. Bukti Surat Jalan wajib diisi.' });
      }

      let headerRow: any = null;
      if (header.id) {
        const { id, created_at, updated_at, ...patch } = header;
        const { data, error } = await supabase
          .from('surat_jalans')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;

        const { error: delErr } = await supabase
          .from('surat_jalan_details')
          .delete()
          .eq('surat_jalan_id', id);
        if (delErr) {
          const msg = String(delErr.message || '').toLowerCase();
          const isMissingTable =
            msg.includes('surat_jalan_details') ||
            msg.includes('schema cache') ||
            msg.includes('does not exist');
          if (!isMissingTable && (!Array.isArray(details) || details.length > 0)) {
            return res.status(400).json({ error: delErr.message });
          }
        }
      } else {
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = header;
        const { data, error } = await supabase
          .from('surat_jalans')
          .insert(insertHeader)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        headerRow = data;
      }

      let savedDetails: any[] = [];
      let detailWarning: string | undefined;
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, updated_at: _u, ...rest } = d;
          return {
            ...rest,
            surat_jalan_id: headerRow.id,
            no_bukti: headerRow.no_bukti,
            no_so: headerRow.no_so || d.no_so || '',
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('surat_jalan_details')
          .insert(payload)
          .select();
        if (detErr) {
          const msg = String(detErr.message || '').toLowerCase();
          const isMissingTable =
            msg.includes('surat_jalan_details') ||
            msg.includes('schema cache') ||
            msg.includes('does not exist');
          if (isMissingTable) {
            detailWarning =
              'Tabel surat_jalan_details belum dibuat di Supabase. Jalankan SQL Query terlebih dahulu.';
          } else {
            return res.status(400).json({ error: detErr.message });
          }
        } else {
          savedDetails = detData || [];
        }
      }

      return res.json({ header: headerRow, details: savedDetails, detailWarning });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Surat Jalan.' });
    }
  });

  // Generic READ endpoint for all tables and views
  app.get('/api/erp/:table', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    const table = req.params.table;
    if (!isReadableResource(table)) {
      return res.status(400).json({ error: `Resource '${table}' tidak diizinkan.` });
    }

    try {
      const selectCols = (req.query.select as string) || '*';
      let query = supabase.from(table).select(selectCols);

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
      const orSearch = req.query.orSearch as string | undefined;
      if (orSearch && searchVal) {
        const cleanVal = searchVal.replace(/[%_,()]/g, ' ').trim();
        const tokens = cleanVal.split(/\s+/).filter(Boolean).slice(0, 6);
        if (tokens.length > 0) {
          const cols = orSearch
            .split(',')
            .map((c) => c.trim())
            .filter((c) => /^[a-zA-Z0-9_]+$/.test(c));
          if (cols.length > 0) {
            for (const token of tokens) {
              query = query.or(cols.map((c) => `${c}.ilike.%${token}%`).join(','));
            }
          }
        }
      } else if (searchCol && searchVal) {
        const cleanVal = searchVal.replace(/[%_]/g, ' ').trim();
        const tokens = cleanVal.split(/\s+/).filter(Boolean).slice(0, 6);
        for (const token of tokens) {
          query = query.ilike(searchCol, `%${token}%`);
        }
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
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

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
      const payload = Array.isArray(body) ? body.map(sanitizeRow) : sanitizeRow(body || {});

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
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

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
      const payload = Array.isArray(body) ? body.map(sanitizeRow) : sanitizeRow(body || {});

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
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    const table = req.params.table;
    const id = req.params.id;
    const matchCol = (req.query.matchCol as string) || 'id';

    if (!isWritableTable(table)) {
      return res.status(400).json({ error: `Tabel '${table}' tidak mendukung pembaruan.` });
    }

    try {
      const copy = { ...(req.body || {}) };
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
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

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
  app.use('/api', (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('[WithCoder ERP API Error]', err);
    return res.status(500).json({
      error: err?.message || 'Internal Server Error pada server ERP.',
    });
  });
}

const vercelApp = express();
registerErpApiRoutes(vercelApp);

export default vercelApp;
