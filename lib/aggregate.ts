import { cleanOrders, type RawOrder } from './clean';

const orders: RawOrder[] = [
  ['1001','2024-01-05','West','Furniture','$1,240.00','New'],['1002','01/12/2024','west','Electronics','860','Returning'],['1003','March 3, 2024','W','Furniture','2,015.50','New'],['1004','2024-02-18','East','Electronics','','Returning'],['1005','2024-02-19','East','Office Supplies','430','New'],['1006','2024/03/01','South','Furniture','1,100','Returning'],['1007','2024-03-02','south','Electronics','720.25','New'],['1001','2024-01-05','West','Furniture','$1,240.00','New'],['1009','2024-03-15','North','Office Supplies','300','New'],['1010','2024-03-16','north','Furniture','950','Returning'],['1011','2024-03-17','N','Electronics','1,580','New'],['1012','2024-03-18','East','Furniture','-150','Returning']
].map(([order_id,order_date,region,category,revenue,customer_type]) => ({ order_id,order_date,region,category,revenue,customer_type }));

export type Measure = 'revenue' | 'orders'; export type GroupBy = 'region' | 'category';
export function aggregate(measure: Measure, groupBy: GroupBy) {
  const { rows, audit, report } = cleanOrders(orders); const groups = new Map<string, { label: string; value: number; orders: number; missingRevenue: number }>();
  rows.forEach(row => { const label = groupBy === 'region' ? row.region : row.category; const group = groups.get(label) ?? { label, value: 0, orders: 0, missingRevenue: 0 }; group.orders++; if (row.revenueCents === null) group.missingRevenue++; else if (measure === 'revenue') group.value += row.revenueCents; if (measure === 'orders') group.value = group.orders; groups.set(label, group); });
  const data = [...groups.values()].sort((a,b) => b.value - a.value); const total = data.reduce((sum, item) => sum + item.value, 0); const knownRevenue = rows.reduce((sum, row) => sum + (row.revenueCents ?? 0), 0);
  return { measure, groupBy, currency: 'USD', data, total, stats: { ...report, knownRevenue }, audit, decisions: ['Regions are normalized case-insensitively; W/N map to West/North.', 'Revenue is parsed into integer cents; blank revenue remains unknown.', 'Duplicate order 1001 is excluded from metrics and retained in the audit.', 'Negative revenue is retained as a refund.', '01/12/2024 is interpreted as January 12, 2024.'] };
}
