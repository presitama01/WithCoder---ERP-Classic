export function matchesMultiKeyword(
  values: (string | number | boolean | null | undefined)[],
  rawTerm: string
): boolean {
  const clean = (rawTerm || '').trim().toLowerCase();
  if (!clean) return true;
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = values
    .map((v) => (v === null || v === undefined ? '' : String(v)))
    .join(' ')
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}
