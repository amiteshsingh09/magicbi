export type RawOrder = { order_id: string; order_date: string; region: string; category: string; revenue: string; customer_type: string };
export type CleanOrder = { orderId: string; date: string | null; region: string; category: string; revenueCents: number | null; customerType: string; sourceRow: number; flags: string[]; raw: RawOrder };

const regions: Record<string, string> = { west: 'West', w: 'West', east: 'East', e: 'East', south: 'South', s: 'South', north: 'North', n: 'North' };

export function normalizeRegion(raw: string) { return regions[raw.trim().toLowerCase()] ?? raw.trim(); }
export function parseRevenue(raw: string) { if (!raw?.trim()) return null; const value = Number(raw.replace(/[$,\s]/g, '')); return Number.isFinite(value) ? Math.round(value * 100) : null; }
export function parseFlexDate(raw: string) {
  const iso = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/); if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (us) return `${us[3]}-${us[1]}-${us[2]}`;
  const long = raw.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/); if (long) { const month = new Date(`${long[1]} 1, ${long[3]}`).getMonth() + 1; return `${long[3]}-${String(month).padStart(2, '0')}-${String(long[2]).padStart(2, '0')}`; }
  return null;
}
export function cleanOrders(rawRows: RawOrder[]) {
  const seen = new Set<string>(); let duplicatesRemoved = 0; let missingRevenue = 0;
  const audit: CleanOrder[] = rawRows.map((raw, index) => {
    const flags: string[] = []; const duplicate = seen.has(raw.order_id); if (duplicate) { flags.push('duplicate_removed'); duplicatesRemoved++; } else seen.add(raw.order_id);
    const revenueCents = parseRevenue(raw.revenue); if (revenueCents === null) { flags.push('missing_revenue'); missingRevenue++; }
    if (revenueCents !== null && revenueCents < 0) flags.push('refund_retained');
    const normalized = normalizeRegion(raw.region); if (normalized !== raw.region) flags.push('region_normalized');
    const date = parseFlexDate(raw.order_date); if (date !== raw.order_date) flags.push('date_normalized');
    return { orderId: raw.order_id, date, region: normalized, category: raw.category, revenueCents, customerType: raw.customer_type, sourceRow: index + 1, flags, raw: { ...raw } };
  });
  return { rows: audit.filter(row => !row.flags.includes('duplicate_removed')), audit, report: { totalIn: rawRows.length, uniqueOrders: rawRows.length - duplicatesRemoved, duplicatesRemoved, missingRevenue } };
}
