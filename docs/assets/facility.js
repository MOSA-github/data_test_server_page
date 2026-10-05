import {resolveReading,formatFuel,fuelState,fuelPercent} from './core.mjs?v=20261006-jsonurl2';
const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function get(url,f){try{const sep=url.includes('?')?'&':'?';const r=await fetch(url+sep+'t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error();return await r.json()}catch{return f}}
async function main(){
  const id=new URLSearchParams(location.search).get('id');const facilities=await get('data/facilities.json',[]);const f=facilities.find(x=>x.id===id);if(!f){$('#main').innerHTML='<p>施設が見つかりません。</p>';return}
  $('#title').textContent=f.name;$('#meta').textContent=[f.id,f.prefecture,f.city,f.address].filter(Boolean).join(' / ');
  const devices=f.devices||[];const cache=new Map();const readings=new Map();
  await Promise.all(devices.filter(d=>d.type==='fuel'&&d.data_url).map(async d=>{let payload=cache.get(d.data_url);if(!payload){payload=await get(d.data_url,{readings:[]});cache.set(d.data_url,payload)}readings.set(d.id,resolveReading(payload));}));
  $('#devices').innerHTML=devices.map(d=>{let body='';if(d.type==='fuel'){const r=readings.get(d.id);const st=fuelState(d,r);const p=fuelPercent(d,r);body=`<div class="fuel-value ${st.level}">${esc(formatFuel(d,r))}</div>${p!=null?`<div class="bar"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div>`:''}<div class="small">状態：${esc(st.label)}${r?.updated_at?` / 更新 ${esc(new Date(r.updated_at).toLocaleString('ja-JP'))}`:''}</div><div class="source-link">データURL：<a href="${esc(d.data_url||'#')}" target="_blank" rel="noopener">${esc(d.data_url||'未設定')}</a></div>`}else body='<div class="small">登録済み設備</div>';return `<article class="device-card"><div class="device-head"><strong>${esc(d.name||d.id)}</strong><span>${esc(d.type)}</span></div>${body}</article>`}).join('')||'<p>設備は未登録です。</p>';
}
main();
