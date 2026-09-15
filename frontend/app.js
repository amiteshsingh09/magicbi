const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(cents/100);
let current = { measure:'revenue', groupBy:'region', chart:'bars', payload:null };
async function load(){
  const res = await fetch(`/api/aggregate?measure=${current.measure}&groupBy=${current.groupBy}`); current.payload = await res.json(); render();
}
function render(){
  const p=current.payload, revenue=p.stats.knownRevenue;
  document.querySelector('#hero-total').textContent=money(revenue); document.querySelector('#stat-revenue').textContent=money(revenue); document.querySelector('#stat-orders').textContent=p.stats.uniqueOrders; document.querySelector('#stat-warnings').textContent=p.stats.missingRevenue+p.stats.duplicates;
  document.querySelector('#chart-title').textContent=`${current.measure==='revenue'?'Net revenue':'Order count'} by ${current.groupBy}`;
  const max=Math.max(...p.data.map(x=>x.value),1), chart=document.querySelector('#chart');
  const format = value => current.measure==='revenue' ? money(value) : `${value} orders`;
  if(current.chart==='bars'){
    chart.innerHTML=`<div class="chart-scale"><span>0</span><span>${format(max)}</span></div>`+p.data.map((x,i)=>`<div class="bar-row" style="--row:${i}"><span class="bar-label">${x.label}<small>${Math.round(x.value/p.total*100)}% of total</small></span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(2,x.value/max*100)}%"></div></div><span class="bar-value">${format(x.value)}</span></div>`).join('');
  } else {
    const colors=['#73cc95','#b7e6c7','#98b8a0','#d9f48b']; let running=0;
    const stops=p.data.map((x,i)=>{ const start=running; running+=x.value/p.total*360; return `${colors[i%colors.length]} ${start}deg ${running}deg`; }).join(',');
    chart.innerHTML=`<div class="donut-layout"><div class="donut" style="background:conic-gradient(${stops})"><div><strong>${format(p.total)}</strong><span>Total</span></div></div><div class="legend">${p.data.map((x,i)=>`<div class="legend-row"><i style="background:${colors[i%colors.length]}"></i><span>${x.label}</span><b>${format(x.value)}</b><small>${Math.round(x.value/p.total*100)}%</small></div>`).join('')}</div></div>`;
  }
  const lead=p.data[0]; const share=lead?Math.round(lead.value/p.total*100):0; document.querySelector('#insight-title').textContent=lead?`${lead.label} leads with ${share}%`:'No data'; document.querySelector('#insight-copy').textContent=lead?`${lead.label} contributes ${format(lead.value)}, representing ${share}% of this ${current.measure==='revenue'?'net revenue':'order'} view.`:'';
  document.querySelector('#missing-mark').textContent=`${p.stats.missingRevenue} row`; document.querySelector('#duplicate-mark').textContent=p.stats.duplicates?'Yes':'None'; document.querySelector('#quality-score').textContent=`${Math.round((1-(p.stats.missingRevenue+p.stats.duplicates)/p.stats.sourceRows)*100)}%`; document.querySelector('#quality-fill').style.width=document.querySelector('#quality-score').textContent;
  document.querySelector('#decisions').innerHTML=p.decisions.map(x=>`<li>${x}</li>`).join(''); document.querySelector('#audit-metrics').innerHTML=[['Source rows',p.stats.sourceRows],['Unique orders',p.stats.uniqueOrders],['Known revenue',money(p.stats.knownRevenue)],['Duplicate rows',p.stats.duplicates]].map(x=>`<div class="metric"><strong>${x[1]}</strong><span>${x[0]}</span></div>`).join('');
}
document.querySelector('#measure').addEventListener('change',e=>{current.measure=e.target.value;load()}); document.querySelector('#groupBy').addEventListener('change',e=>{current.groupBy=e.target.value;load()}); document.querySelectorAll('.toggle').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.toggle').forEach(x=>x.classList.remove('active'));b.classList.add('active');current.chart=b.dataset.chart;render()})); const showAudit=()=>{const panel=document.querySelector('#audit-panel');panel.classList.add('open');panel.scrollIntoView({behavior:'smooth',block:'start'})}; document.querySelector('#audit').addEventListener('click',showAudit); document.querySelector('#close-audit').addEventListener('click',()=>document.querySelector('#audit-panel').classList.remove('open')); document.querySelector('#explain').addEventListener('click',showAudit); load();
