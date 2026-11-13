// Shared Supabase ERP API client & data transformation helpers

export interface CompanyProfileData {
  id?: string;
  profile_code: string;
  company_name: string;
  no_npwp: string;
  npwp_address: string;
  tanggal_npwp: string | null;
  address: string;
  country: string;
  phone: string;
  fax: string;
  mail: string;
  ppn_active: boolean;
  ppn_value: number;
  wirajaya: boolean;
  backup: boolean;
}

export const FALLBACK_COMPANY_PROFILE: CompanyProfileData = {
  profile_code: '01',
  company_name: 'PT. UNIMETRIKA UTAMA',
  no_npwp: '01.603.251.8-048.000',
  npwp_address: 'JL. AGUNG TIMUR 8 BLOK D KAV. NO.7\nSUNTER JAYA, TANJUNG PRIOK - JAKARTA UTARA',
  tanggal_npwp: '1993-05-26',
  address: 'JL. AGUNG TIMUR 8 BLOK D KAV. NO.7\nSUNTER JAYA, TANJUNG PRIOK - JAKARTA UTARA',
  country: 'INDONESIA',
  phone: '021-65304111',
  fax: '021-65304110',
  mail: 'umu@unimetrika.co.id',
  ppn_active: false,
  ppn_value: 0,
  wirajaya: true,
  backup: true,
};

export interface ErpQueryOptions {
  orderBy?: string;
  asc?: boolean;
  searchCol?: string;
  searchVal?: string;
  eq?: Record<string, string | number | boolean>;
  gte?: Record<string, string | number>;
  lte?: Record<string, string | number>;
  ilike?: Record<string, string>;
  limit?: number;
  select?: string;
}

function buildQueryParams(opts?: ErpQueryOptions): string {
  if (!opts) return '';
  const params = new URLSearchParams();
  if (opts.select) params.set('select', opts.select);
  if (opts.orderBy) params.set('orderBy', opts.orderBy);
  if (opts.asc !== undefined) params.set('asc', String(opts.asc));
  if (opts.searchCol && opts.searchVal) {
    params.set('searchCol', opts.searchCol);
    params.set('searchVal', opts.searchVal);
  }
  if (opts.limit) params.set('limit', String(opts.limit));

  if (opts.eq) {
    for (const [k, v] of Object.entries(opts.eq)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(`eq_${k}`, String(v));
      }
    }
  }
  if (opts.gte) {
    for (const [k, v] of Object.entries(opts.gte)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(`gte_${k}`, String(v));
      }
    }
  }
  if (opts.lte) {
    for (const [k, v] of Object.entries(opts.lte)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(`lte_${k}`, String(v));
      }
    }
  }
  if (opts.ilike) {
    for (const [k, v] of Object.entries(opts.ilike)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(`ilike_${k}`, String(v));
      }
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function parseApiResponse<T = any>(res: Response, fallbackErrMsg: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const rawText = await res.text().catch(() => '');
    if (res.status === 502 || res.status === 503 || res.status === 504 || rawText.includes('The page c')) {
      throw new Error('Server backend sedang memuat atau memulai ulang. Mohon tunggu beberapa detik lalu coba lagi.');
    }
    if (!res.ok) {
      throw new Error(`Koneksi server gagal (${res.status}): ${rawText.slice(0, 120) || res.statusText}`);
    }
    throw new Error(`Respon tidak terduga dari server (${contentType || 'non-JSON'}).`);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch (parseErr: any) {
    if (!res.ok) {
      throw new Error(`Gagal memproses data server (HTTP ${res.status}).`);
    }
    throw new Error(`Respon format JSON tidak valid: ${parseErr?.message || 'Parse error'}`);
  }

  if (!res.ok) {
    throw new Error(json?.error || fallbackErrMsg);
  }

  return json as T;
}

async function requestWithRetry(
  url: string,
  init?: RequestInit,
  retries = 5,
  backoffMs = 700
): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      // Our Express /api/* routes always return JSON.
      // A 502/503/504 or non-JSON response (e.g. "The page could not be found" HTML)
      // indicates the proxy/backend is restarting or waking up.
      if (
        (res.status === 502 || res.status === 503 || res.status === 504 || !isJson) &&
        attempt < retries
      ) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError || new Error('Gagal terhubung ke server ERP.');
}

export async function erpList<T = any>(table: string, opts?: ErpQueryOptions): Promise<T[]> {
  const qs = buildQueryParams(opts);
  const res = await requestWithRetry(`/api/erp/${encodeURIComponent(table)}${qs}`);
  const json = await parseApiResponse<{ data: T[] }>(res, `Gagal mengambil data ${table}`);
  return (json.data || []) as T[];
}

export async function erpCreate<T = any>(table: string, payload: Partial<T> | Partial<T>[]): Promise<T> {
  const res = await requestWithRetry(`/api/erp/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await parseApiResponse<{ data: T }>(res, `Gagal menyimpan data ${table}`);
  return json.data as T;
}

export async function erpUpsert<T = any>(
  table: string,
  payload: Partial<T> | Partial<T>[],
  onConflict?: string
): Promise<T> {
  const qs = onConflict ? `?onConflict=${encodeURIComponent(onConflict)}` : '';
  const res = await requestWithRetry(`/api/erp/${encodeURIComponent(table)}/upsert${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await parseApiResponse<{ data: T }>(res, `Gagal upsert data ${table}`);
  return json.data as T;
}

export async function erpUpdate<T = any>(
  table: string,
  id: string,
  payload: Partial<T>,
  matchCol = 'id'
): Promise<T> {
  const qs = matchCol !== 'id' ? `?matchCol=${encodeURIComponent(matchCol)}` : '';
  const res = await requestWithRetry(`/api/erp/${encodeURIComponent(table)}/${encodeURIComponent(id)}${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await parseApiResponse<{ data: T }>(res, `Gagal memperbarui data ${table}`);
  return json.data as T;
}

export async function erpDelete(table: string, id: string, matchCol = 'id'): Promise<void> {
  const qs = matchCol !== 'id' ? `?matchCol=${encodeURIComponent(matchCol)}` : '';
  const res = await requestWithRetry(`/api/erp/${encodeURIComponent(table)}/${encodeURIComponent(id)}${qs}`, {
    method: 'DELETE',
  });
  await parseApiResponse<{ ok: boolean }>(res, `Gagal menghapus data ${table}`);
}

export async function erpCompositeSave<T = any>(
  endpoint: 'giro-pembelian' | 'giro-penjualan' | 'jurnal-umum',
  header: Record<string, any>,
  details?: Record<string, any>[]
): Promise<T> {
  const res = await requestWithRetry(`/api/erp/composite/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ header, details }),
  });
  const json = await parseApiResponse<T>(res, `Gagal menyimpan transaksi ${endpoint}`);
  return json;
}

export async function fetchActiveCompanyProfile(): Promise<CompanyProfileData> {
  try {
    const list = await erpList<CompanyProfileData>('company_profiles', {
      orderBy: 'profile_code',
      asc: true,
      limit: 1,
    });
    if (list && list.length > 0) {
      return {
        ...FALLBACK_COMPANY_PROFILE,
        ...list[0],
        address: list[0].address || FALLBACK_COMPANY_PROFILE.address,
        npwp_address: list[0].npwp_address || FALLBACK_COMPANY_PROFILE.npwp_address,
      };
    }
  } catch {
    // Fallback gracefully
  }
  return FALLBACK_COMPANY_PROFILE;
}

// Date Helpers
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  mei: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  agu: '08',
  sep: '09',
  oct: '10',
  okt: '10',
  nov: '11',
  dec: '12',
  des: '12',
};

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toIsoDate(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO timestamp
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

  // dd-mm-yyyy or dd/mm/yyyy
  const dmyNum = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyNum) {
    const [, dd, mm, yyyy] = dmyNum;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // dd-MMM-yyyy or dd-MMM-yy
  const dmyMon = s.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2,4})$/);
  if (dmyMon) {
    const [, dd, monStr, yr] = dmyMon;
    const mm = MONTH_MAP[monStr.slice(0, 3).toLowerCase()];
    if (mm) {
      const yyyy = yr.length === 2 ? `20${yr}` : yr;
      return `${yyyy}-${mm}-${dd.padStart(2, '0')}`;
    }
  }

  return null;
}

export function toDisplayDmy(input?: string | null): string {
  if (!input) return '';
  const iso = toIsoDate(input);
  if (!iso) return input;
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function toDisplayDMyShort(input?: string | null): string {
  if (!input) return '';
  const iso = toIsoDate(input);
  if (!iso) return input;
  const [y, m, d] = iso.split('-');
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1));
  return `${d}-${MONTHS_SHORT[monthIdx]}-${y}`;
}

// Numeric Helpers
export function parseNum(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '').replace(/\.+$/, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(val: unknown, trailingDot = false): string {
  const n = parseNum(val);
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return trailingDot && !formatted.includes('.') ? `${formatted}.` : formatted;
}

export function formatRupiah(val: unknown): string {
  const n = parseNum(val);
  return `Rp ${n.toLocaleString('id-ID')}`;
}
