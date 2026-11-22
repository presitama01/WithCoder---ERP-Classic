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
  'purchase_request_details',
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

  // Helpers for Purchasing -> Stock, PO Fulfillment, HPP, and Giro Payment Sync
  const isMissingSchemaError = (errMsg: string): boolean => {
    const m = String(errMsg || '').toLowerCase();
    return (
      m.includes('schema cache') ||
      m.includes('does not exist') ||
      m.includes('could not find the')
    );
  };

  const omitKeys = (obj: Record<string, any>, keys: string[]): Record<string, any> => {
    const copy = { ...obj };
    for (const k of keys) delete copy[k];
    return copy;
  };

  const adjustMasterBarangStockAndCost = async (
    supabase: SupabaseClient,
    qtyDeltaByKode: Record<string, number>,
    latestCostByKode: Record<string, number> = {}
  ): Promise<void> => {
    const kodes = Array.from(
      new Set([...Object.keys(qtyDeltaByKode), ...Object.keys(latestCostByKode)].filter(Boolean))
    );
    if (kodes.length === 0) return;

    try {
      const { data: items, error } = await supabase
        .from('master_barangs')
        .select('id, kode, stock, cost')
        .in('kode', kodes);
      if (error || !items) return;

      for (const item of items) {
        const k = String(item.kode || '').trim().toUpperCase();
        const delta = Number(qtyDeltaByKode[k] || 0);
        const newCost = Number(latestCostByKode[k] || 0);
        const patch: Record<string, any> = {};
        if (delta !== 0) {
          patch.stock = Math.max(0, Number((Number(item.stock || 0) + delta).toFixed(2)));
        }
        if (newCost > 0) {
          patch.cost = newCost;
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from('master_barangs').update(patch).eq('id', item.id);
        }
      }
    } catch {
      // Non-fatal sync
    }
  };

  const syncPurchaseOrderFulfillment = async (
    supabase: SupabaseClient,
    noPoList: string[]
  ): Promise<void> => {
    const targets = Array.from(
      new Set(
        noPoList
          .map((s) => String(s || '').trim().toUpperCase())
          .filter((s) => s && s !== '-')
      )
    );
    if (targets.length === 0) return;

    for (const noPo of targets) {
      try {
        const { data: poRows } = await supabase
          .from('purchase_orders')
          .select('id, no_bukti')
          .eq('no_bukti', noPo)
          .limit(1);
        const po = poRows?.[0];
        if (!po) continue;

        const { data: poDetails } = await supabase
          .from('purchase_order_details')
          .select('id, kode, qty')
          .eq('po_id', po.id);
        if (!poDetails || poDetails.length === 0) continue;

        const { data: postedPembelians } = await supabase
          .from('pembelian_barangs')
          .select('id')
          .eq('no_po', noPo)
          .eq('sts_post', 'Posted');

        const receivedByKode: Record<string, number> = {};
        const pembIds = (postedPembelians || []).map((p: any) => p.id).filter(Boolean);
        if (pembIds.length > 0) {
          const { data: pembDetails } = await supabase
            .from('pembelian_barang_details')
            .select('kode, qty, terima')
            .in('pembelian_id', pembIds);
          for (const d of pembDetails || []) {
            const kode = String(d.kode || '').trim().toUpperCase();
            if (!kode) continue;
            const qtyVal = Number(d.terima || 0) > 0 ? Number(d.terima) : Number(d.qty || 0);
            receivedByKode[kode] = (receivedByKode[kode] || 0) + qtyVal;
          }
        }

        let totalOrdered = 0;
        let totalReceived = 0;
        let allReceived = true;

        for (const det of poDetails) {
          const kode = String(det.kode || '').trim().toUpperCase();
          const orderedQty = Number(det.qty || 0);
          const recQty = Number(receivedByKode[kode] || 0);
          totalOrdered += orderedQty;
          totalReceived += Math.min(orderedQty, recQty);
          if (orderedQty > 0 && recQty < orderedQty) {
            allReceived = false;
          }
          await supabase
            .from('purchase_order_details')
            .update({ terima: recQty })
            .eq('id', det.id);
        }

        const persen =
          totalOrdered > 0
            ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100))
            : 0;
        const poClose = allReceived && totalOrdered > 0 ? 'Closed' : 'Not Yet';

        await supabase
          .from('purchase_orders')
          .update({ po_close: poClose, persen })
          .eq('id', po.id);
      } catch {
        // Non-fatal sync
      }
    }
  };

  const syncPembelianToHpp = async (
    supabase: SupabaseClient,
    savedHeader: Record<string, any>
  ): Promise<void> => {
    if (!savedHeader?.no_bukti) return;
    try {
      const { data: existing } = await supabase
        .from('hpp_pembelians')
        .select('id')
        .eq('no_bukti', savedHeader.no_bukti)
        .limit(1);

      const hppPayload: Record<string, any> = {
        no_bukti: savedHeader.no_bukti,
        tanggal: savedHeader.tanggal,
        nama_supplier: savedHeader.nama_supplier,
        no_po: savedHeader.no_po || '-',
        no_faktur_pembelian: savedHeader.no_faktur || '-',
        keterangan: savedHeader.keterangan || '',
        nilai_pembelian: Number(savedHeader.nilai_pembelian || 0),
        jth_tmp: savedHeader.jth_tmp || savedHeader.tanggal,
        sts_lunas: savedHeader.sts_lunas || 'Belum',
        tgl_lunas: savedHeader.tgl_lunas || null,
        sts_post: savedHeader.sts_post || 'Posted',
        tgl_post: savedHeader.tgl_post || null,
        dibuat_oleh: savedHeader.dibuat_oleh || 'ADMIN',
        tgl_created: savedHeader.tgl_created || savedHeader.tanggal,
        diupdate_oleh: savedHeader.diupdate_oleh || '-',
        tgl_update: savedHeader.tgl_update || null,
      };

      if (existing && existing.length > 0) {
        await supabase.from('hpp_pembelians').update(hppPayload).eq('id', existing[0].id);
      } else if (savedHeader.sts_post === 'Posted') {
        await supabase.from('hpp_pembelians').insert(hppPayload);
      }
    } catch {
      // Non-fatal sync
    }
  };

  const syncGiroPembelianToHutangAndPo = async (
    supabase: SupabaseClient,
    refs: Array<{ refType: string; noRef: string }>,
    fallbackDate?: string
  ): Promise<void> => {
    const uniquePairs = new Map<string, { refType: string; noRef: string }>();
    for (const r of refs) {
      const refType = String(r.refType || '').trim().toUpperCase();
      const noRef = String(r.noRef || '').trim().toUpperCase();
      if (!refType || !noRef || noRef === '-') continue;
      uniquePairs.set(`${refType}::${noRef}`, { refType, noRef });
    }
    if (uniquePairs.size === 0) return;

    for (const { refType, noRef } of uniquePairs.values()) {
      try {
        const { data: giroRows, error } = await supabase
          .from('giro_pembelian_details')
          .select('amount_paid, sts_cair, due, header_id')
          .eq('ref_type', refType)
          .eq('no_ref', noRef);
        if (error) continue;

        const cairRows = (giroRows || []).filter(
          (g: any) => String(g.sts_cair || 'Cair').toUpperCase() === 'CAIR'
        );
        const totalPaid = cairRows.reduce((s: number, g: any) => s + Number(g.amount_paid || 0), 0);
        const latestDue = cairRows.map((g: any) => g.due).filter(Boolean).sort().pop();
        const lunasDate = latestDue || fallbackDate || new Date().toISOString().slice(0, 10);

        if (refType === 'PEMBELIAN') {
          const { data: pembRows } = await supabase
            .from('pembelian_barangs')
            .select('id, nilai_pembelian')
            .eq('no_bukti', noRef)
            .limit(1);
          const pemb = pembRows?.[0];
          if (!pemb) continue;

          const targetNilai = Number(pemb.nilai_pembelian || 0);
          const isLunas = totalPaid > 0 && (targetNilai <= 0 || totalPaid >= targetNilai);
          const patch = {
            sts_lunas: isLunas ? 'Lunas' : 'Belum',
            tgl_lunas: isLunas ? lunasDate : null,
          };
          await supabase.from('pembelian_barangs').update(patch).eq('id', pemb.id);
          await supabase.from('hpp_pembelians').update(patch).eq('no_bukti', noRef);
        } else if (refType === 'PO') {
          const { data: poRows } = await supabase
            .from('purchase_orders')
            .select('id, nilai_po')
            .eq('no_bukti', noRef)
            .limit(1);
          const po = poRows?.[0];
          if (!po) continue;

          const targetNilai = Number(po.nilai_po || 0);
          const isLunas = totalPaid > 0 && targetNilai > 0 && totalPaid >= targetNilai;
          await supabase
            .from('purchase_orders')
            .update({
              deposit: totalPaid,
              tgl_lunas: isLunas ? lunasDate : null,
            })
            .eq('id', po.id);
        }
      } catch {
        // Non-fatal sync
      }
    }
  };

  const syncMasterBarangQtyPo = async (
    supabase: SupabaseClient,
    kodes: string[]
  ): Promise<void> => {
    const cleanKodes = Array.from(
      new Set(kodes.map((k) => String(k || '').trim().toUpperCase()).filter(Boolean))
    );
    if (cleanKodes.length === 0) return;

    try {
      const { data: openPos } = await supabase
        .from('purchase_orders')
        .select('id, po_close')
        .neq('po_close', 'Closed');
      const openPoIds = (openPos || []).map((p: any) => p.id).filter(Boolean);

      const qtyPoByKode: Record<string, number> = {};
      if (openPoIds.length > 0) {
        const { data: poDets } = await supabase
          .from('purchase_order_details')
          .select('kode, qty, terima, po_id')
          .in('po_id', openPoIds)
          .in('kode', cleanKodes);

        for (const d of poDets || []) {
          const k = String(d.kode || '').trim().toUpperCase();
          if (!k) continue;
          const remaining = Math.max(0, Number(d.qty || 0) - Number(d.terima || 0));
          qtyPoByKode[k] = Number(((qtyPoByKode[k] || 0) + remaining).toFixed(2));
        }
      }

      for (const k of cleanKodes) {
        await supabase
          .from('master_barangs')
          .update({ qty_po: qtyPoByKode[k] || 0 })
          .eq('kode', k);
      }
    } catch {
      // Non-fatal sync
    }
  };

  const syncMasterBarangQtySo = async (
    supabase: SupabaseClient,
    kodes: string[]
  ): Promise<void> => {
    const cleanKodes = Array.from(
      new Set(kodes.map((k) => String(k || '').trim().toUpperCase()).filter(Boolean))
    );
    if (cleanKodes.length === 0) return;

    try {
      const { data: openSos } = await supabase
        .from('sales_orders')
        .select('id, so_close')
        .neq('so_close', 'Closed');
      const openSoIds = (openSos || []).map((s: any) => s.id).filter(Boolean);

      const qtySoByKode: Record<string, number> = {};
      if (openSoIds.length > 0) {
        const { data: soDets } = await supabase
          .from('sales_order_details')
          .select('kode, qty, terima, so_id')
          .in('so_id', openSoIds)
          .in('kode', cleanKodes);

        for (const d of soDets || []) {
          const k = String(d.kode || '').trim().toUpperCase();
          if (!k) continue;
          const remaining = Math.max(0, Number(d.qty || 0) - Number(d.terima || 0));
          qtySoByKode[k] = Number(((qtySoByKode[k] || 0) + remaining).toFixed(2));
        }
      }

      for (const k of cleanKodes) {
        await supabase
          .from('master_barangs')
          .update({ qty_so: qtySoByKode[k] || 0 })
          .eq('kode', k);
      }
    } catch {
      // Non-fatal sync
    }
  };

  const syncSupplierHutang = async (
    supabase: SupabaseClient,
    supplierNames: string[]
  ): Promise<void> => {
    const names = Array.from(
      new Set(supplierNames.map((n) => String(n || '').trim().toUpperCase()).filter(Boolean))
    );
    if (names.length === 0) return;

    for (const supName of names) {
      try {
        const [{ data: pembRows }, { data: returRows }, { data: giroDets }] = await Promise.all([
          supabase
            .from('pembelian_barangs')
            .select('no_bukti, nilai_pembelian, sts_post, sts_lunas')
            .eq('nama_supplier', supName),
          supabase
            .from('retur_pembelians')
            .select('nilai_retur, sts_post')
            .eq('nama_supplier', supName),
          supabase
            .from('giro_pembelian_details')
            .select('amount_paid, sts_cair, ref_type, no_ref')
            .eq('supplier', supName),
        ]);

        const postedPemb = (pembRows || []).filter(
          (p: any) => String(p.sts_post || '').toUpperCase() === 'POSTED'
        );
        const totalOpenPemb = postedPemb
          .filter((p: any) => String(p.sts_lunas || '').toUpperCase() !== 'LUNAS')
          .reduce((s: number, p: any) => s + Number(p.nilai_pembelian || 0), 0);

        const openPembBuktiSet = new Set(
          postedPemb
            .filter((p: any) => String(p.sts_lunas || '').toUpperCase() !== 'LUNAS')
            .map((p: any) => String(p.no_bukti || '').trim().toUpperCase())
        );

        const totalRetur = (returRows || [])
          .filter((r: any) => String(r.sts_post || '').toUpperCase() === 'POSTED')
          .reduce((s: number, r: any) => s + Number(r.nilai_retur || 0), 0);

        let cairOnOpenPemb = 0;
        let pendingGiroTotal = 0;
        for (const g of giroDets || []) {
          const st = String(g.sts_cair || 'Cair').toUpperCase();
          const amt = Number(g.amount_paid || 0);
          if (st === 'CAIR') {
            const refType = String(g.ref_type || '').toUpperCase();
            const noRef = String(g.no_ref || '').trim().toUpperCase();
            if (refType === 'PEMBELIAN' && openPembBuktiSet.has(noRef)) {
              cairOnOpenPemb += amt;
            }
          } else if (st !== 'TOLAK' && st !== 'BATAL') {
            pendingGiroTotal += amt;
          }
        }

        const netHutang = Math.max(
          0,
          Number((totalOpenPemb - cairOnOpenPemb - totalRetur).toFixed(2))
        );
        const netHutangGiro = Math.max(0, Number(pendingGiroTotal.toFixed(2)));

        await supabase
          .from('master_suppliers')
          .update({ hutang: netHutang, hutang_giro: netHutangGiro })
          .eq('nama_supplier', supName);
      } catch {
        // Non-fatal sync
      }
    }
  };

  const syncCustomerPiutang = async (
    supabase: SupabaseClient,
    customerNames: string[]
  ): Promise<void> => {
    const names = Array.from(
      new Set(customerNames.map((n) => String(n || '').trim().toUpperCase()).filter(Boolean))
    );
    if (names.length === 0) return;

    for (const custName of names) {
      try {
        const [{ data: fakturRows }, { data: giroDets }] = await Promise.all([
          supabase
            .from('faktur_penjualans')
            .select('nilai_penjualan, sts_lunas, sts_post')
            .eq('nama_customer', custName),
          supabase
            .from('giro_penjualan_details')
            .select('amount_paid')
            .eq('customer', custName),
        ]);

        const totalPiutang = (fakturRows || [])
          .filter((f: any) => String(f.sts_lunas || '').toUpperCase() !== 'LUNAS')
          .reduce((s: number, f: any) => s + Number(f.nilai_penjualan || 0), 0);

        const totalGiro = (giroDets || []).reduce(
          (s: number, g: any) => s + Number(g.amount_paid || 0),
          0
        );

        await supabase
          .from('master_customers')
          .update({
            piutang: Math.max(0, Number(totalPiutang.toFixed(2))),
            piutang_giro: Math.max(0, Number(totalGiro.toFixed(2))),
          })
          .eq('nama_customer', custName);
      } catch {
        // Non-fatal sync
      }
    }
  };

  // Composite endpoints for Master-Detail transactions
  app.post('/api/erp/composite/purchase-request', async (req: Request, res: Response) => {
    const { client: supabase, missingEnv } = getSupabaseClient();
    if (!supabase || missingEnv) {
      return res.status(500).json({ error: getMissingEnvMessage() });
    }

    try {
      const { header, details } = (req.body || {}) as {
        header: Record<string, any>;
        details?: Record<string, any>[];
      };
      if (!header?.no_pr) {
        return res.status(400).json({ error: 'No. PR wajib diisi.' });
      }

      let detailWarning: string | undefined;
      let headerRow: any = null;
      const runSaveHeader = async (payloadObj: Record<string, any>) => {
        if (header.id) {
          const { id, created_at, updated_at, ...patch } = payloadObj;
          return supabase
            .from('purchase_requests')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        }
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = payloadObj;
        return supabase
          .from('purchase_requests')
          .insert(insertHeader)
          .select()
          .single();
      };

      let hdrRes = await runSaveHeader(header);
      if (hdrRes.error && isMissingSchemaError(hdrRes.error.message)) {
        detailWarning = 'Kolom tambahan Purchase Request belum dibuat di Supabase. Jalankan supabase_migration_purchasing_workflow.sql.';
        hdrRes = await runSaveHeader(omitKeys(header, ['keterangan']));
      }
      if (hdrRes.error) return res.status(400).json({ error: hdrRes.error.message });
      headerRow = hdrRes.data;

      if (header.id) {
        const { error: delErr } = await supabase
          .from('purchase_request_details')
          .delete()
          .eq('pr_id', header.id);
        if (delErr) {
          if (isMissingSchemaError(delErr.message)) {
            detailWarning = 'Tabel purchase_request_details belum dibuat di Supabase. Jalankan supabase_migration_purchasing_workflow.sql.';
          } else if (!Array.isArray(details) || details.length > 0) {
            return res.status(400).json({ error: delErr.message });
          }
        }
      }

      let savedDetails: any[] = [];
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, updated_at: _u, ...rest } = d;
          return {
            ...rest,
            pr_id: headerRow.id,
            no_pr: headerRow.no_pr,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        const { data: detData, error: detErr } = await supabase
          .from('purchase_request_details')
          .insert(payload)
          .select();
        if (detErr) {
          if (isMissingSchemaError(detErr.message)) {
            detailWarning = 'Tabel purchase_request_details belum dibuat di Supabase. Jalankan supabase_migration_purchasing_workflow.sql.';
          } else {
            return res.status(400).json({ error: detErr.message });
          }
        } else {
          savedDetails = detData || [];
        }
      }

      return res.json({ header: headerRow, details: savedDetails, detailWarning });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal menyimpan Purchase Request.' });
    }
  });

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

      const affectedRefs: Array<{ refType: string; noRef: string }> = [];
      if (header.id) {
        try {
          const { data: oldDets } = await supabase
            .from('giro_pembelian_details')
            .select('ref_type, no_ref')
            .eq('header_id', header.id);
          for (const od of oldDets || []) {
            if (od.ref_type && od.no_ref) {
              affectedRefs.push({ refType: od.ref_type, noRef: od.no_ref });
            }
          }
        } catch {}
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

        try {
          const { data: oldDets } = await supabase
            .from('giro_pembelian_details')
            .select('ref_type, no_ref')
            .eq('header_id', headerRow.id);
          for (const od of oldDets || []) {
            if (od.ref_type && od.no_ref) {
              affectedRefs.push({ refType: od.ref_type, noRef: od.no_ref });
            }
          }
        } catch {}

        await supabase
          .from('giro_pembelian_details')
          .delete()
          .eq('header_id', headerRow.id);
      }

      let savedDetails: any[] = [];
      let detailWarning: string | undefined;
      if (Array.isArray(details) && details.length > 0) {
        const payload = details.map((d, idx) => {
          const { id: _id, created_at: _c, ...rest } = d;
          if (d.ref_type && d.no_ref) {
            affectedRefs.push({ refType: d.ref_type, noRef: d.no_ref });
          }
          return {
            ...rest,
            header_id: headerRow.id,
            no_urut: d.no_urut ?? idx + 1,
          };
        });
        let detRes = await supabase
          .from('giro_pembelian_details')
          .insert(payload)
          .select();
        if (detRes.error && isMissingSchemaError(detRes.error.message)) {
          detailWarning = 'Kolom ref_type/no_ref/no_faktur/sts_cair pada giro_pembelian_details belum dibuat di Supabase. Jalankan supabase_migration_purchasing_workflow.sql.';
          const fallbackPayload = payload.map((p) =>
            omitKeys(p, ['ref_type', 'no_ref', 'no_faktur', 'sts_cair'])
          );
          detRes = await supabase
            .from('giro_pembelian_details')
            .insert(fallbackPayload)
            .select();
        }
        if (detRes.error) return res.status(400).json({ error: detRes.error.message });
        savedDetails = detRes.data || [];
      }

      await syncGiroPembelianToHutangAndPo(supabase, affectedRefs, headerRow.tanggal);

      const affectedSuppliers = (savedDetails || []).map((d: any) => d.supplier).filter(Boolean);
      if (affectedSuppliers.length > 0) {
        await syncSupplierHutang(supabase, affectedSuppliers);
      }

      return res.json({ header: headerRow, details: savedDetails, detailWarning });
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

      const affectedCustomers = (savedDetails || []).map((d: any) => d.customer).filter(Boolean);
      if (affectedCustomers.length > 0) {
        await syncCustomerPiutang(supabase, affectedCustomers);
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

      const poKodes = (savedDetails || []).map((d: any) => d.kode).filter(Boolean);
      if (poKodes.length > 0) {
        await syncMasterBarangQtyPo(supabase, poKodes);
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

      let oldHeader: any = null;
      let oldDetails: any[] = [];
      if (header.id) {
        const { data: prevHdr } = await supabase
          .from('pembelian_barangs')
          .select('*')
          .eq('id', header.id)
          .single();
        oldHeader = prevHdr || null;
        const { data: prevDet } = await supabase
          .from('pembelian_barang_details')
          .select('*')
          .eq('pembelian_id', header.id);
        oldDetails = prevDet || [];
      }

      let detailWarning: string | undefined;
      const runSaveHeader = async (payloadObj: Record<string, any>) => {
        if (header.id) {
          const { id, created_at, updated_at, ...patch } = payloadObj;
          return supabase
            .from('pembelian_barangs')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        }
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = payloadObj;
        return supabase
          .from('pembelian_barangs')
          .insert(insertHeader)
          .select()
          .single();
      };

      let hdrRes = await runSaveHeader(header);
      if (hdrRes.error && isMissingSchemaError(hdrRes.error.message)) {
        detailWarning = 'Kolom mata_uang/ppn/nilai_ppn pada pembelian_barangs belum dibuat di Supabase. Jalankan supabase_migration_purchasing_workflow.sql.';
        hdrRes = await runSaveHeader(omitKeys(header, ['mata_uang', 'ppn', 'nilai_ppn']));
      }
      if (hdrRes.error) return res.status(400).json({ error: hdrRes.error.message });
      const headerRow: any = hdrRes.data;

      if (header.id) {
        const { error: delErr } = await supabase
          .from('pembelian_barang_details')
          .delete()
          .eq('pembelian_id', header.id);
        if (delErr && (!Array.isArray(details) || details.length > 0)) {
          return res.status(400).json({ error: delErr.message });
        }
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

      // 1. Update stock & cost delta on master_barangs
      const stockDelta: Record<string, number> = {};
      const latestCost: Record<string, number> = {};
      if (oldHeader && String(oldHeader.sts_post || '').toUpperCase() === 'POSTED') {
        for (const od of oldDetails) {
          const kode = String(od.kode || '').trim().toUpperCase();
          if (!kode) continue;
          const q = Number(od.terima || 0) > 0 ? Number(od.terima) : Number(od.qty || 0);
          stockDelta[kode] = (stockDelta[kode] || 0) - q;
        }
      }
      if (String(headerRow.sts_post || '').toUpperCase() === 'POSTED') {
        for (const nd of savedDetails) {
          const kode = String(nd.kode || '').trim().toUpperCase();
          if (!kode) continue;
          const q = Number(nd.terima || 0) > 0 ? Number(nd.terima) : Number(nd.qty || 0);
          stockDelta[kode] = (stockDelta[kode] || 0) + q;
          if (Number(nd.harga || 0) > 0) {
            latestCost[kode] = Number(nd.harga);
          }
        }
      }
      await adjustMasterBarangStockAndCost(supabase, stockDelta, latestCost);

      // 2. Sync PO terima & po_close
      await syncPurchaseOrderFulfillment(supabase, [
        oldHeader?.no_po || '',
        headerRow.no_po || '',
      ]);

      // 3. Sync HPP Pembelian & Master Barang Qty.PO & Supplier Hutang
      await syncPembelianToHpp(supabase, headerRow);
      await syncMasterBarangQtyPo(
        supabase,
        [...oldDetails.map((d: any) => d.kode), ...savedDetails.map((d: any) => d.kode)]
      );
      await syncSupplierHutang(supabase, [
        oldHeader?.nama_supplier || '',
        headerRow?.nama_supplier || '',
      ]);

      return res.json({ header: headerRow, details: savedDetails, detailWarning });
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

      let oldHeader: any = null;
      let oldDetails: any[] = [];
      if (header.id) {
        const { data: prevHdr } = await supabase
          .from('retur_pembelians')
          .select('*')
          .eq('id', header.id)
          .single();
        oldHeader = prevHdr || null;
        const { data: prevDet } = await supabase
          .from('retur_pembelian_details')
          .select('*')
          .eq('retur_id', header.id);
        oldDetails = prevDet || [];
      }

      let detailWarning: string | undefined;
      const runSaveHeader = async (payloadObj: Record<string, any>) => {
        if (header.id) {
          const { id, created_at, updated_at, ...patch } = payloadObj;
          return supabase
            .from('retur_pembelians')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        }
        const { id: _ignore, created_at: _c, updated_at: _u, ...insertHeader } = payloadObj;
        return supabase
          .from('retur_pembelians')
          .insert(insertHeader)
          .select()
          .single();
      };

      let hdrRes = await runSaveHeader(header);
      if (hdrRes.error && isMissingSchemaError(hdrRes.error.message)) {
        detailWarning = 'Kolom no_pembelian/nilai_disc/nilai_ppn pada retur_pembelians belum dibuat di Supabase. Jalankan supabase_migration_purchasing_workflow.sql.';
        hdrRes = await runSaveHeader(
          omitKeys(header, ['no_pembelian', 'nilai_disc', 'nilai_ppn'])
        );
      }
      if (hdrRes.error) return res.status(400).json({ error: hdrRes.error.message });
      const headerRow: any = hdrRes.data;

      if (header.id) {
        const { error: delErr } = await supabase
          .from('retur_pembelian_details')
          .delete()
          .eq('retur_id', header.id);
        if (delErr && (!Array.isArray(details) || details.length > 0)) {
          return res.status(400).json({ error: delErr.message });
        }
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

      // Sync stock reduction on master_barangs (add back old retur, subtract new retur)
      const stockDelta: Record<string, number> = {};
      if (oldHeader && String(oldHeader.sts_post || '').toUpperCase() === 'POSTED') {
        for (const od of oldDetails) {
          const kode = String(od.kode || '').trim().toUpperCase();
          if (!kode) continue;
          const q = Number(od.qty || 0);
          stockDelta[kode] = (stockDelta[kode] || 0) + q;
        }
      }
      if (String(headerRow.sts_post || '').toUpperCase() === 'POSTED') {
        for (const nd of savedDetails) {
          const kode = String(nd.kode || '').trim().toUpperCase();
          if (!kode) continue;
          const q = Number(nd.qty || 0);
          stockDelta[kode] = (stockDelta[kode] || 0) - q;
        }
      }
      await adjustMasterBarangStockAndCost(supabase, stockDelta);
      await syncSupplierHutang(supabase, [
        oldHeader?.nama_supplier || '',
        headerRow?.nama_supplier || '',
      ]);

      return res.json({ header: headerRow, details: savedDetails, detailWarning });
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

      const soKodes = (savedDetails || []).map((d: any) => d.kode).filter(Boolean);
      if (soKodes.length > 0) {
        await syncMasterBarangQtySo(supabase, soKodes);
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

      if (headerRow?.nama_customer) {
        await syncCustomerPiutang(supabase, [headerRow.nama_customer]);
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
      if (table === 'pembelian_barangs' && matchCol === 'id') {
        const { data: oldHdr } = await supabase
          .from('pembelian_barangs')
          .select('*')
          .eq('id', id)
          .single();
        const { data: oldDets } = await supabase
          .from('pembelian_barang_details')
          .select('*')
          .eq('pembelian_id', id);
        await supabase.from('pembelian_barang_details').delete().eq('pembelian_id', id);

        const { error } = await supabase.from(table).delete().eq(matchCol, id);
        if (error) return res.status(400).json({ error: error.message });

        if (oldHdr && String(oldHdr.sts_post || '').toUpperCase() === 'POSTED' && oldDets) {
          const stockDelta: Record<string, number> = {};
          for (const od of oldDets) {
            const kode = String(od.kode || '').trim().toUpperCase();
            if (!kode) continue;
            const q = Number(od.terima || 0) > 0 ? Number(od.terima) : Number(od.qty || 0);
            stockDelta[kode] = (stockDelta[kode] || 0) - q;
          }
          await adjustMasterBarangStockAndCost(supabase, stockDelta);
        }
        if (oldHdr?.no_po) {
          await syncPurchaseOrderFulfillment(supabase, [oldHdr.no_po]);
        }
        if (oldHdr?.no_bukti) {
          await supabase.from('hpp_pembelians').delete().eq('no_bukti', oldHdr.no_bukti);
        }
        if (oldDets && oldDets.length > 0) {
          await syncMasterBarangQtyPo(supabase, oldDets.map((d: any) => d.kode));
        }
        if (oldHdr?.nama_supplier) {
          await syncSupplierHutang(supabase, [oldHdr.nama_supplier]);
        }
        return res.json({ ok: true });
      }

      if (table === 'retur_pembelians' && matchCol === 'id') {
        const { data: oldHdr } = await supabase
          .from('retur_pembelians')
          .select('*')
          .eq('id', id)
          .single();
        const { data: oldDets } = await supabase
          .from('retur_pembelian_details')
          .select('*')
          .eq('retur_id', id);
        await supabase.from('retur_pembelian_details').delete().eq('retur_id', id);

        const { error } = await supabase.from(table).delete().eq(matchCol, id);
        if (error) return res.status(400).json({ error: error.message });

        if (oldHdr && String(oldHdr.sts_post || '').toUpperCase() === 'POSTED' && oldDets) {
          const stockDelta: Record<string, number> = {};
          for (const od of oldDets) {
            const kode = String(od.kode || '').trim().toUpperCase();
            if (!kode) continue;
            stockDelta[kode] = (stockDelta[kode] || 0) + Number(od.qty || 0);
          }
          await adjustMasterBarangStockAndCost(supabase, stockDelta);
        }
        if (oldHdr?.nama_supplier) {
          await syncSupplierHutang(supabase, [oldHdr.nama_supplier]);
        }
        return res.json({ ok: true });
      }

      if (table === 'giro_pembelian_headers' && matchCol === 'id') {
        let oldRefs: Array<{ refType: string; noRef: string }> = [];
        let oldSuppliers: string[] = [];
        try {
          const { data: oldDets } = await supabase
            .from('giro_pembelian_details')
            .select('ref_type, no_ref, supplier')
            .eq('header_id', id);
          oldRefs = (oldDets || [])
            .filter((d: any) => d.ref_type && d.no_ref)
            .map((d: any) => ({ refType: d.ref_type, noRef: d.no_ref }));
          oldSuppliers = (oldDets || []).map((d: any) => d.supplier).filter(Boolean);
        } catch {}

        await supabase.from('giro_pembelian_details').delete().eq('header_id', id);
        const { error } = await supabase.from(table).delete().eq(matchCol, id);
        if (error) return res.status(400).json({ error: error.message });

        if (oldRefs.length > 0) {
          await syncGiroPembelianToHutangAndPo(supabase, oldRefs);
        }
        if (oldSuppliers.length > 0) {
          await syncSupplierHutang(supabase, oldSuppliers);
        }
        return res.json({ ok: true });
      }

      if (table === 'purchase_orders' && matchCol === 'id') {
        const { data: oldDets } = await supabase
          .from('purchase_order_details')
          .select('kode')
          .eq('po_id', id);
        await supabase.from('purchase_order_details').delete().eq('po_id', id);
        const { error } = await supabase.from(table).delete().eq(matchCol, id);
        if (error) return res.status(400).json({ error: error.message });
        if (oldDets && oldDets.length > 0) {
          await syncMasterBarangQtyPo(supabase, oldDets.map((d: any) => d.kode));
        }
        return res.json({ ok: true });
      }

      if (table === 'sales_orders' && matchCol === 'id') {
        const { data: oldDets } = await supabase
          .from('sales_order_details')
          .select('kode')
          .eq('so_id', id);
        await supabase.from('sales_order_details').delete().eq('so_id', id);
        const { error } = await supabase.from(table).delete().eq(matchCol, id);
        if (error) return res.status(400).json({ error: error.message });
        if (oldDets && oldDets.length > 0) {
          await syncMasterBarangQtySo(supabase, oldDets.map((d: any) => d.kode));
        }
        return res.json({ ok: true });
      }

      if (table === 'faktur_penjualans' && matchCol === 'id') {
        const { data: oldHdr } = await supabase
          .from('faktur_penjualans')
          .select('nama_customer')
          .eq('id', id)
          .single();
        try {
          await supabase.from('faktur_penjualan_details').delete().eq('faktur_id', id);
        } catch {}
        const { error } = await supabase.from(table).delete().eq(matchCol, id);
        if (error) return res.status(400).json({ error: error.message });
        if (oldHdr?.nama_customer) {
          await syncCustomerPiutang(supabase, [oldHdr.nama_customer]);
        }
        return res.json({ ok: true });
      }

      if (table === 'giro_penjualan_headers' && matchCol === 'id') {
        const { data: oldDets } = await supabase
          .from('giro_penjualan_details')
          .select('customer')
          .eq('header_id', id);
        await supabase.from('giro_penjualan_details').delete().eq('header_id', id);
        const { error } = await supabase.from(table).delete().eq(matchCol, id);
        if (error) return res.status(400).json({ error: error.message });
        const custs = (oldDets || []).map((d: any) => d.customer).filter(Boolean);
        if (custs.length > 0) {
          await syncCustomerPiutang(supabase, custs);
        }
        return res.json({ ok: true });
      }

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
