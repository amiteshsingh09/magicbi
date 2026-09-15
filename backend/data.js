const SOURCE_ROWS = [
  { order_id: '1001', order_date: '2024-01-05', region: 'West', category: 'Furniture', revenue: '$1,240.00', customer_type: 'New' },
  { order_id: '1002', order_date: '01/12/2024', region: 'west', category: 'Electronics', revenue: '860', customer_type: 'Returning' },
  { order_id: '1003', order_date: 'March 3, 2024', region: 'W', category: 'Furniture', revenue: '2,015.50', customer_type: 'New' },
  { order_id: '1004', order_date: '2024-02-18', region: 'East', category: 'Electronics', revenue: '', customer_type: 'Returning' },
  { order_id: '1005', order_date: '2024-02-19', region: 'East', category: 'Office Supplies', revenue: '430', customer_type: 'New' },
  { order_id: '1006', order_date: '2024/03/01', region: 'South', category: 'Furniture', revenue: '1,100', customer_type: 'Returning' },
  { order_id: '1007', order_date: '2024-03-02', region: 'south', category: 'Electronics', revenue: '720.25', customer_type: 'New' },
  { order_id: '1001', order_date: '2024-01-05', region: 'West', category: 'Furniture', revenue: '$1,240.00', customer_type: 'New' },
  { order_id: '1009', order_date: '2024-03-15', region: 'North', category: 'Office Supplies', revenue: '300', customer_type: 'New' },
  { order_id: '1010', order_date: '2024-03-16', region: 'north', category: 'Furniture', revenue: '950', customer_type: 'Returning' },
  { order_id: '1011', order_date: '2024-03-17', region: 'N', category: 'Electronics', revenue: '1,580', customer_type: 'New' },
  { order_id: '1012', order_date: '2024-03-18', region: 'East', category: 'Furniture', revenue: '-150', customer_type: 'Returning' }
];

const REGION_MAP = { west: 'West', w: 'West', east: 'East', e: 'East', south: 'South', s: 'South', north: 'North', n: 'North' };

function parseMoney(value) {
  if (value === '' || value == null) return null;
  const amount = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function normalizeDate(value) {
  const match = String(value).match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const us = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1]}-${us[2]}`;
  const long = String(value).match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (long) {
    const month = new Date(`${long[1]} 1, ${long[3]}`).getMonth() + 1;
    return `${long[3]}-${String(month).padStart(2, '0')}-${String(long[2]).padStart(2, '0')}`;
  }
  return null;
}

function normalizedRows() {
  const seen = new Set();
  return SOURCE_ROWS.map((row, index) => {
    const region = REGION_MAP[String(row.region).trim().toLowerCase()] || 'Unknown';
    const revenueCents = parseMoney(row.revenue);
    const duplicate = seen.has(row.order_id);
    if (!duplicate) seen.add(row.order_id);
    return { ...row, sourceRow: index + 1, normalizedRegion: region, normalizedDate: normalizeDate(row.order_date), revenueCents, duplicate, included: !duplicate };
  });
}

function aggregate(measure = 'revenue', groupBy = 'region') {
  const rows = normalizedRows();
  const included = rows.filter(r => r.included);
  const groups = new Map();
  included.forEach(row => {
    const key = groupBy === 'category' ? row.category : row.normalizedRegion;
    if (!groups.has(key)) groups.set(key, { label: key, value: 0, knownRevenue: 0, orders: 0, missingRevenue: 0 });
    const item = groups.get(key);
    item.orders += 1;
    if (row.revenueCents == null) item.missingRevenue += 1;
    else { item.knownRevenue += row.revenueCents; if (measure === 'revenue') item.value += row.revenueCents; }
    if (measure === 'orders') item.value = item.orders;
  });
  const data = [...groups.values()].sort((a, b) => b.value - a.value);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return {
    measure, groupBy, currency: 'USD', data, total,
    stats: { sourceRows: rows.length, uniqueOrders: included.length, knownRevenue: included.reduce((sum, r) => sum + (r.revenueCents || 0), 0), missingRevenue: included.filter(r => r.revenueCents == null).length, duplicates: rows.filter(r => r.duplicate).length },
    audit: rows,
    decisions: ['Regions are normalized case-insensitively; W/N are treated as West/North.', 'Revenue is parsed into integer cents; blank revenue remains unknown.', 'The repeated order 1001 is retained once and flagged as a duplicate.', 'Negative revenue is retained as a refund and included in net revenue.', '01/12/2024 is interpreted as January 12, 2024.']
  };
}

module.exports = { aggregate };
