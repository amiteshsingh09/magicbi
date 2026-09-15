'use client';

import { useEffect, useRef, useState } from 'react';
import type { CleanOrder } from '@/lib/clean';

type Point = { label: string; value: number; orders: number; missingRevenue: number };
type Result = {
  measure: 'revenue' | 'orders'; groupBy: 'region' | 'category'; total: number; data: Point[];
  stats: { totalIn: number; uniqueOrders: number; duplicatesRemoved: number; missingRevenue: number; knownRevenue: number };
  audit: CleanOrder[]; decisions: string[];
};
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const share = (value: number, total: number) => total > 0 ? (value / total * 100).toFixed(1) : '0.0';
const colors = ['#31785b', '#74ab8d', '#a2c5ad', '#d1dfb5'];
const flagNames: Record<string, string> = { duplicate_removed: 'Duplicate excluded', missing_revenue: 'Revenue unknown', region_normalized: 'Region normalized', date_normalized: 'Date normalized', refund_retained: 'Refund retained' };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/></>,
    bars: <path d="M5 19V9M12 19V4M19 19v-7"/>,
    donut: <><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M16 3.8v4.2h4.2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    alert: <><path d="M12 3 2 21h20zM12 9v5M12 17v.1"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 7a7 7 0 0 1 12-2L20 8M4 16l2.5 3a7 7 0 0 0 12-2"/></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/></>,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>;
}

export default function Page() {
  const [measure, setMeasure] = useState<Result['measure']>('revenue');
  const [groupBy, setGroupBy] = useState<Result['groupBy']>('region');
  const [chart, setChart] = useState<'bars' | 'donut'>('bars');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [audit, setAudit] = useState(false);
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(''); setActivePoint(null);
    fetch(`/api/aggregate?measure=${measure}&groupBy=${groupBy}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Could not load the orders.'); return response.json(); })
      .then((data: Result) => { if (!Array.isArray(data.data) || !Array.isArray(data.audit)) throw new Error('Unexpected data response.'); setResult(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Could not load the orders.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [measure, groupBy, retry]);

  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2500); return () => clearTimeout(timer); }, [copied]);
  const format = (value: number) => result?.measure === 'orders' ? value.toLocaleString('en-US') : money(value);
  const lead = result?.data[0];
  const tied = result && lead ? result.data.filter(row => row.value === lead.value) : [];
  const ready = !!result && !busy && !error;
  const maximum = Math.max(...(result?.data.map(row => row.value) ?? [1]), 1);
  const selected = result?.data.find(row => row.label === activePoint);
  const canDonut = !!result && result.total > 0 && result.data.every(row => row.value >= 0);
  const refunds = result?.audit.filter(row => row.flags.includes('refund_retained') && !row.flags.includes('duplicate_removed')).length ?? 0;
  function exportResults() {
    if (!result || !ready) return;
    const contents = ['Group,' + (result.measure === 'revenue' ? 'Known net revenue (USD)' : 'Order count') + ',Orders,Unknown revenue rows', ...result.data.map(row => `"${row.label.replaceAll('"', '""')}",${result.measure === 'revenue' ? (row.value / 100).toFixed(2) : row.value},${row.orders},${row.missingRevenue}`)].join('\r\n');
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `orders-${result.groupBy}-${result.measure}.csv`; a.click(); URL.revokeObjectURL(url); setCopied(true);
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="MagicBI home"><span className="brand-symbol"><Icon name="spark" size={23}/></span>magic<span className="brand-bi">bi</span><span className="brand-divider"/><span className="workspace-name">Analytics workspace</span></a><div className="header-right"><span className="environment"><span/>Demo workspace</span><span className="avatar" aria-label="Demo user">M</span></div></header>
    <main className="workspace">
      <div className="breadcrumb"><Icon name="grid" size={14}/><span>Workspace</span><span>/</span><strong>Orders overview</strong></div>
      <section className="page-heading entrance"><div><div className="eyebrow">YOUR DATA, A LITTLE CLEARER</div><h1>Orders overview<span>.</span></h1><p>A clear picture of your revenue. Every row accounted for.</p></div><div className="heading-actions"><span className="date-chip"><Icon name="clock" size={15}/>Jan – Mar 2024</span><button className="button primary" onClick={exportResults} disabled={!ready}><Icon name={copied ? 'check' : 'download'} size={16}/>{copied ? 'Exported' : 'Export view'}</button></div></section>
      <div className="source-strip entrance"><span className="source-icon"><Icon name="file"/></span><strong>orders.csv</strong><span className="source-divider"/><span>{result ? `${result.stats.totalIn} source rows` : 'Reading source rows'}</span><span className="source-status" role="status"><span className={busy ? 'spinner' : error ? 'error-dot' : 'status-dot'}/>{busy ? 'Calculating your view' : error ? 'Connection needs attention' : 'Source connected'}</span></div>
      <section className="metrics entrance" aria-label="Dataset overview">
        <Metric label="Known net revenue" value={result ? money(result.stats.knownRevenue) : null} icon="bars" prominent note="Net of refunds · USD"><span className="metric-tag">1 amount unknown</span></Metric>
        <Metric label="Unique orders" value={result ? String(result.stats.uniqueOrders) : null} icon="file" note="After exact duplicate removal"><span className="metric-tag neutral">{result?.stats.duplicatesRemoved ?? '—'} duplicate excluded</span></Metric>
        <Metric label="Revenue coverage" value={result ? `${result.stats.uniqueOrders - result.stats.missingRevenue} / ${result.stats.uniqueOrders}` : null} icon="shield" note="Unique orders with a known amount"><span className="coverage-mini"><i style={{ width: result ? `${(result.stats.uniqueOrders - result.stats.missingRevenue) / result.stats.uniqueOrders * 100}%` : 0 }}/></span></Metric>
      </section>
      <section className="analysis-grid entrance">
        <article className="panel chart-panel"><div className="panel-heading"><div><div className="eyebrow">EXPLORE YOUR ORDERS</div><h2>{measure === 'revenue' ? 'Revenue' : 'Orders'} by {groupBy}</h2></div><span className="small-badge"><Icon name="shield" size={14}/>Calculated from source</span></div>
          <div className="controls"><label>Measure<select aria-label="Measure" value={measure} onChange={event => setMeasure(event.target.value as Result['measure'])}><option value="revenue">Net revenue</option><option value="orders">Order count</option></select></label><label>Break down by<select aria-label="Break down by" value={groupBy} onChange={event => setGroupBy(event.target.value as Result['groupBy'])}><option value="region">Region</option><option value="category">Category</option></select></label><div className="chart-switch" role="group" aria-label="Chart type"><button aria-pressed={chart === 'bars'} onClick={() => setChart('bars')}><Icon name="bars" size={16}/>Bars</button><button aria-pressed={chart === 'donut'} onClick={() => setChart('donut')}><Icon name="donut" size={16}/>Donut</button></div></div>
          <div className="chart-content" aria-busy={busy}>
            {busy ? <ChartSkeleton/> : error ? <div className="empty-state" role="alert"><span className="empty-icon"><Icon name="alert" size={24}/></span><h3>Let’s try that again</h3><p>{error} Your source data is unchanged.</p><button className="button primary" onClick={() => setRetry(n => n + 1)}><Icon name="refresh"/>Retry loading</button></div> : !result?.data.length ? <div className="empty-state"><Icon name="file" size={30}/><h3>No orders to show</h3><p>This view does not contain any groups.</p></div> : chart === 'donut' && canDonut ? <div className="donut-layout chart-enter" key={`${measure}-${groupBy}`}><div className="donut-visual"><svg viewBox="0 0 200 200" role="img" aria-label={`${measure === 'revenue' ? 'Revenue' : 'Order'} share by ${groupBy}; exact values in the legend`}><circle cx="100" cy="100" r="78" className="donut-track"/>{result.data.map((row, index) => { const offset = result.data.slice(0, index).reduce((sum, r) => sum + r.value, 0) / result.total * 100; return <circle key={row.label} cx="100" cy="100" r="78" pathLength="100" fill="none" stroke={colors[index % colors.length]} strokeWidth={activePoint === row.label ? 28 : 24} strokeDasharray={`${row.value / result.total * 100} ${100 - row.value / result.total * 100}`} strokeDashoffset={-offset} transform="rotate(-90 100 100)" onMouseEnter={() => setActivePoint(row.label)} onMouseLeave={() => setActivePoint(null)}><title>{row.label}: {format(row.value)}</title></circle>; })}</svg><div className="donut-center"><span>{selected ? selected.label : 'Total in this view'}</span><strong>{format(selected?.value ?? result.total)}</strong><small>{selected ? `${share(selected.value, result.total)}% of total` : measure === 'revenue' ? 'Known revenue · USD' : 'Unique orders'}</small></div></div><div className="legend">{result.data.map((row, index) => <button key={row.label} className={activePoint === row.label ? 'highlighted' : ''} onMouseEnter={() => setActivePoint(row.label)} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint(row.label)} onBlur={() => setActivePoint(null)} onClick={() => setActivePoint(activePoint === row.label ? null : row.label)}><span className="legend-color" style={{ background: colors[index % colors.length] }}/><span>{row.label}<small>{row.orders} orders{row.missingRevenue ? ' · amount unknown' : ''}</small></span><strong>{format(row.value)}<small>{share(row.value, result.total)}%</small></strong></button>)}</div></div> : <div className="bar-chart chart-enter" key={`${measure}-${groupBy}-${chart}`}>
              {chart === 'donut' && <p className="chart-warning">This view includes negative values or a zero total. Bars show those amounts accurately.</p>}
              <div className="chart-axis"><span>{measure === 'revenue' ? 'KNOWN NET REVENUE · USD' : 'UNIQUE ORDERS'}</span><span>SHARE</span></div>
              {result.data.map((row, index) => <div className="bar-row" key={row.label} style={{ animationDelay: `${index * 65}ms` }}><div className="bar-label"><strong>{row.label}</strong><span>{format(row.value)}{row.missingRevenue > 0 && <span className="missing-marker" title={`${row.missingRevenue} order has unknown revenue`}>*</span>}</span></div><div className="bar-line"><div className="bar-track"><span className="bar-fill" style={{ width: `${Math.abs(row.value) / Math.max(maximum, Math.abs(Math.min(...result.data.map(r => r.value)))) * 100}%`, background: colors[index % colors.length], animationDelay: `${index * 65}ms` }}/></div><span className="bar-share">{share(row.value, result.total)}%</span></div></div>)}
              <div className="axis-baseline"><span>0</span><span>{format(maximum)}</span></div>
            </div>}
          </div>
          <div className="chart-footer"><span><Icon name="file" size={14}/>{measure === 'revenue' ? 'Refunds included. Unknown revenue excluded.' : 'All unique orders, including unknown revenue.'}</span><button className="text-button" disabled={!ready} onClick={() => setAudit(true)}>View calculations<Icon name="arrow" size={14}/></button></div>
        </article>
        <aside className="insights-column"><section className="insight-card"><div className="insight-top"><span className="insight-symbol"><Icon name="spark" size={21}/></span><span>THE SHORT STORY</span></div>{!ready ? <div className="insight-placeholder"><span className="skeleton"/><span className="skeleton"/><p>{error ? 'Insights will appear when data reconnects.' : 'Finding the story in your orders…'}</p></div> : lead ? <><h2>{tied.length > 1 ? `${tied.map(row => row.label).join(' & ')} share the lead.` : <>{lead.label} takes<br/>the lead<span>.</span></>}</h2><p><strong>{format(lead.value)}</strong> {measure === 'revenue' ? 'in known net revenue' : 'orders'}{tied.length > 1 ? ' each' : ''}, representing <strong>{share(lead.value, result.total)}%</strong> of this view{tied.length > 1 ? ' per group' : ''}.</p><div className="insight-mini-chart" aria-hidden="true">{result.data.map((row, index) => <span key={row.label} style={{ height: `${Math.max(5, row.value / maximum * 70)}px`, background: index === 0 ? '#d8edb5' : '#ffffff26' }}/>)}</div><span className="insight-caption">Summary from calculated results</span></> : <p>No results available.</p>}</section>
          <section className="panel quality-panel"><div className="quality-heading"><h3>A little context</h3><Icon name="shield" size={18}/></div><p className="quality-description">The details behind a trustworthy total.</p><div className="quality-item"><span className="quality-icon warning"><Icon name="alert" size={15}/></span><div><strong>{result?.stats.missingRevenue ?? '—'} unknown amount</strong><span>Revenue is incomplete</span></div><span className="status-label">Review</span></div><div className="quality-item"><span className="quality-icon"><Icon name="check" size={15}/></span><div><strong>{result?.stats.duplicatesRemoved ?? '—'} duplicate excluded</strong><span>Counted once, kept in the audit</span></div></div><div className="quality-item"><span className="quality-icon"><Icon name="check" size={15}/></span><div><strong>{refunds} refund retained</strong><span>Included in net revenue</span></div></div><button className="audit-button" disabled={!ready} onClick={() => setAudit(true)}>Inspect row-level audit <Icon name="arrow" size={17}/></button></section>
        </aside>
      </section>
      <section className="panel breakdown-panel entrance"><div className="breakdown-heading"><div><h2>The numbers, in detail</h2><p>Exact values behind the chart.</p></div><span className="table-count">{ready ? result.data.length : '—'} groups</span></div><div className="table-scroll"><table><caption className="sr-only">Aggregated orders by {groupBy}</caption><thead><tr><th>{groupBy === 'region' ? 'Region' : 'Category'}</th><th className="numeric">{measure === 'revenue' ? 'Known net revenue' : 'Order count'}</th><th className="numeric">Share</th><th className="numeric">Unique orders</th><th>Revenue completeness</th></tr></thead><tbody>{ready ? result.data.map((row, index) => <tr key={row.label}><td><span className="table-group"><i style={{ background: colors[index % colors.length] }}/>{row.label}</span></td><td className="numeric tabular">{format(row.value)}</td><td className="numeric muted">{share(row.value, result.total)}%</td><td className="numeric muted">{row.orders}</td><td><span className={`pill ${row.missingRevenue ? 'amber' : ''}`}>{row.missingRevenue ? `${row.missingRevenue} amount unknown` : 'All amounts known'}</span></td></tr>) : <tr><td colSpan={5}><div className={busy ? 'skeleton table-skeleton' : 'table-message'}>{busy ? '' : 'Reconnect to view these values.'}</div></td></tr>}</tbody>{ready && <tfoot><tr><td>Total</td><td className="numeric tabular">{format(result.total)}</td><td className="numeric">100%</td><td className="numeric">{result.stats.uniqueOrders}</td><td className="muted">{result.stats.missingRevenue} amount unknown</td></tr></tfoot>}</table></div></section>
      <footer className="page-footer"><span><Icon name="shield" size={14}/>Built for answers you can trace.</span><span>orders.csv<span className="footer-dot">·</span>USD<span className="footer-dot">·</span>January–March 2024</span></footer>
    </main>
    {result && <AuditDialog open={audit} onClose={() => setAudit(false)} result={result}/>}
  </div>;
}

function Metric({ label, value, icon, note, prominent, children }: { label: string; value: string | null; icon: string; note: string; prominent?: boolean; children: React.ReactNode }) {
  return <article className={`metric-card ${prominent ? 'metric-featured' : ''}`}><div className="metric-label"><span>{label}</span><Icon name={icon} size={18}/></div>{value === null ? <div className="skeleton metric-skeleton"/> : <strong className="metric-value">{value}</strong>}<div className="metric-note">{note}</div>{children}</article>;
}

function ChartSkeleton() {
  return <div className="chart-skeleton" role="status"><span className="sr-only">Loading chart</span>{[82, 63, 46, 25].map(width => <div key={width}><div className="skeleton skeleton-label"/><div className="skeleton skeleton-bar" style={{ width: `${width}%` }}/></div>)}</div>;
}

function AuditDialog({ open, onClose, result }: { open: boolean; onClose: () => void; result: Result }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState<'cleaned' | 'raw'>('cleaned');
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [open]);
  const rows = result.audit.filter(row => {
    const matches = `${row.orderId} ${row.region} ${row.category} ${row.sourceRow}`.toLowerCase().includes(search.toLowerCase());
    return matches && (filter === 'all' || (filter === 'flagged' ? row.flags.length > 0 : row.flags.includes(filter)));
  });
  return <dialog ref={dialog} className="audit-dialog" aria-labelledby="audit-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="audit-header"><div><div className="eyebrow">NOTHING HIDDEN, EVERY ROW EXPLAINED</div><h2 id="audit-title">Row-level audit</h2><p>Inspect the original values and see exactly what changed.</p></div><button className="icon-button" aria-label="Close row-level audit" onClick={onClose} autoFocus><Icon name="close" size={21}/></button></div>
    <div className="audit-body"><div className="audit-reconciliation"><div><strong>{result.stats.totalIn}</strong><span>source rows</span></div><Icon name="arrow"/><div><strong>{result.stats.uniqueOrders}</strong><span>unique orders</span></div><Icon name="arrow"/><div><strong>{result.stats.uniqueOrders - result.stats.missingRevenue}</strong><span>known amounts</span></div><div className="audit-total"><strong>{money(result.stats.knownRevenue)}</strong><span>known net revenue</span></div></div>
      <div className="audit-notice"><Icon name="alert" size={18}/><p><strong>One amount is still unknown.</strong> Order 1004 counts as an order, but contributes no known revenue. The total is incomplete.</p></div>
      <div className="audit-tools"><label className="search-input"><Icon name="search" size={17}/><input aria-label="Search audit rows" placeholder="Search order, region, category…" value={search} onChange={e => setSearch(e.target.value)}/></label><label className="sr-only" htmlFor="audit-filter">Filter audit rows</label><select id="audit-filter" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All rows</option><option value="flagged">Rows with changes</option><option value="duplicate_removed">Duplicates</option><option value="missing_revenue">Unknown revenue</option><option value="refund_retained">Refunds</option></select><div className="chart-switch" role="group" aria-label="Audit values"><button aria-pressed={mode === 'cleaned'} onClick={() => setMode('cleaned')}>Cleaned</button><button aria-pressed={mode === 'raw'} onClick={() => setMode('raw')}>Original</button></div></div>
      <div className="audit-table-scroll"><table><caption className="sr-only">{mode === 'raw' ? 'Original' : 'Cleaned'} source rows and data decisions</caption><thead><tr><th>Row / order</th><th>Date</th><th>Region</th><th>Category</th><th className="numeric">Revenue</th><th>Decision</th></tr></thead><tbody>{rows.map(row => <tr key={row.sourceRow} className={row.flags.includes('duplicate_removed') ? 'excluded-row' : ''}><td><span className="row-number">{row.sourceRow.toString().padStart(2, '0')}</span><strong>#{row.orderId}</strong></td><td className="audit-date">{mode === 'raw' ? row.raw.order_date : row.date ?? 'Invalid date'}</td><td>{mode === 'raw' ? row.raw.region : row.region}</td><td>{row.category}</td><td className={`numeric tabular ${row.revenueCents !== null && row.revenueCents < 0 ? 'refund-text' : ''}`}>{mode === 'raw' ? row.raw.revenue || '(blank)' : row.revenueCents === null ? 'Unknown' : money(row.revenueCents)}</td><td><div className="flag-list">{row.flags.length ? row.flags.map(flag => <span key={flag} className={`pill ${flag === 'missing_revenue' ? 'amber' : flag === 'duplicate_removed' ? 'gray' : ''}`}>{flagNames[flag] ?? flag}</span>) : <span className="unchanged">Included unchanged</span>}</div></td></tr>)}{!rows.length && <tr><td colSpan={6}><div className="audit-empty"><Icon name="search" size={24}/><strong>No matching rows</strong><p>Try another order number or reset the filters.</p><button className="button secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Reset filters</button></div></td></tr>}</tbody></table></div>
      <div className="audit-row-count" role="status">Showing {rows.length} of {result.audit.length} source rows · {mode === 'raw' ? 'Original values' : 'Normalized values'}</div><details className="policy-details"><summary>Data decisions & assumptions</summary><ul>{result.decisions.map(decision => <li key={decision}>{decision}</li>)}</ul></details>
    </div><div className="audit-bottom"><span><Icon name="shield" size={15}/>Excluded rows stay visible in this audit.</span><button className="button primary" onClick={onClose}>Done inspecting<Icon name="check" size={16}/></button></div>
  </dialog>;
}
