import { erpList, erpUpdate } from './erpApi';

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function isValidWebsite(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

export interface UsageCheckSpec {
  table: string;
  label: string;
  eq?: Record<string, string | number | boolean>;
  ilike?: Record<string, string>;
}

/**
 * Checks whether a Master record is still referenced in other Master/Transaction tables.
 * Returns a human-readable usage message if referenced, or null if safe to delete.
 */
export async function checkMasterUsage(checks: UsageCheckSpec[]): Promise<string | null> {
  const results = await Promise.allSettled(
    checks.map(async (c) => {
      const hasEq = c.eq && Object.values(c.eq).some((v) => String(v ?? '').trim() !== '');
      const hasIlike = c.ilike && Object.values(c.ilike).some((v) => String(v ?? '').trim() !== '');
      if (!hasEq && !hasIlike) return null;
      const rows = await erpList<any>(c.table, {
        eq: c.eq,
        ilike: c.ilike,
        limit: 1,
      });
      return rows.length > 0 ? c.label : null;
    })
  );

  const usedIn = results
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is string => Boolean(v));

  if (usedIn.length === 0) return null;
  return `Data masih digunakan pada: ${usedIn.join(', ')}. Hapus atau nonaktifkan referensi terkait terlebih dahulu.`;
}

/**
 * Best-effort cascade update for text-based references when a Master name/label is renamed.
 */
export async function cascadeMasterRename(
  targetTable: string,
  matchCol: string,
  oldValue: string,
  patch: Record<string, any>
): Promise<void> {
  const cleanOld = oldValue.trim();
  if (!cleanOld) return;
  try {
    await erpUpdate(targetTable, cleanOld, patch, matchCol);
  } catch {
    // Non-fatal: table or matching rows may not exist
  }
}

export function isMissingColumnError(errMsg: string): boolean {
  const m = String(errMsg || '').toLowerCase();
  return m.includes('schema cache') || m.includes('does not exist') || m.includes('could not find the');
}
