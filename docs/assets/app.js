import {resolveReading,readingKey,formatFuel,fuelState,countByType,findLatestPower} from './core.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let facilities=[], latest=[], fuelMap=new Map();

async function getJson(url, fallback){
  try{const sep=url.includes('?')?'&':'?';const r=await fetch(`${url}${sep}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json();}
  catch(e){console.warn('fetch failed',url,e);return fallback;}
}

async function loadFuelReadings(){
  const map=new Map();
  const cache=new Map();
  const tasks=[];
  for(const f of facilities){
    for(const d of (f.devices||[]).filter(x=>x.type==='fuel'&&x.data_url)){
      tasks.push((async()=>{
        let payload=cache.get(d.data_url);
        if(!payload){payload=await getJson(d.data_url,{readings:[]});cache.set(d.data_url,payload);}
        const reading=resolveReading(payload,f,d);
        if(reading)map.set(readingKey(f.id,d.id),reading);
      })());
    }
  }
  await Promise.all(tasks); return map;
}

function badge(label, state='muted'){return `<span class="badge ${state}">${esc(label)}</span>`}
function deviceSummary(f){
  const devices=f.devices||[];
  const water=countByType(devices,'water');
  const power=countByType(devices,'power');
  const generator=countByType(devices,'generator');
  const camera=countByType(devices,'camera');
  const fuels=devices.filter(d=>d.type==='fuel');
  const fuelText = fuels.length ? fuels.map(d=>formatFuel(d,fuelMap.get(readingKey(f.id,d.id)))).join(' / ') : '未登録';
  const fuelWorst = fuels.reduce((acc,d)=>{const st=fuelState(d,fuelMap.get(readingKey(f.id,d.id))).level;const rank={nodata:0,normal:1,warning:2,critical:3};return rank[st]>rank[acc]?st:acc},'nodata');
  return [
    badge(`水位：${water?'登録あり':'データなし'}`,water?'ok':'muted'),
    badge(`電力：${power?'登録あり':'データなし'}`,power?'ok':'muted'),
    badge(`発電機：${generator?'登録あり':'データなし'}`,generator?'ok':'muted'),
    badge(`燃料：${fuelText}`,fuelWorst==='critical'?'danger':fuelWorst==='warning'?'warn':fuels.length&&fuelWorst!=='nodata'?'ok':'muted'),
    badge(`カメラ：${camera?camera+'台':'データなし'}`,camera?'ok':'muted')
  ].join('');
}
function statusLabel(s){return s==='normal'?['正常','ok']:s==='offline'?['オフライン','muted']:['要確認','warn'];}
function render(){
  const q=$('#q').value.trim().toLowerCase(),st=$('#statusFilter').value,region=$('#regionFilter').value;
  const rows=facilities.filter(f=>(!q||[f.id,f.name,f.prefecture,f.city].join(' ').toLowerCase().includes(q))&&(!st||f.status===st)&&(!region||f.prefecture===region));
  $('#count').textContent=`${rows.length} 件の病院`;
  $('#cards').innerHTML=rows.map(f=>{const [sl,sc]=statusLabel(f.status);const p=findLatestPower(latest,f.id);const n=(f.devices||[]).length;return `<article class="facility-card" tabindex="0" data-id="${esc(f.id)}"><div class="card-top"><span class="facility-id">${esc(f.id)}</span>${badge(sl,sc)}</div><h2>${esc(f.name)}</h2><div class="place">${esc([f.prefecture,f.city].filter(Boolean).join(' '))}</div><div class="badges">${deviceSummary(f)}</div><div class="metrics"><div><strong>${n}</strong><span>登録設備</span></div><div><strong>${p==null?'データなし':p.toLocaleString('ja-JP')+' W'}</strong><span>現在の電力</span></div></div></article>`}).join('')||'<div class="empty">条件に合う病院がありません。</div>';
  document.querySelectorAll('.facility-card').forEach(el=>el.addEventListener('click',()=>location.href=`facility.html?id=${encodeURIComponent(el.dataset.id)}`));
}
async function main(){
  [facilities,latest]=await Promise.all([getJson('data/facilities.json',[]),getJson('data/latest.json',[])]);
  fuelMap=await loadFuelReadings();
  const regions=[...new Set(facilities.map(f=>f.prefecture).filter(Boolean))];$('#regionFilter').innerHTML='<option value="">すべての地域</option>'+regions.map(x=>`<option>${esc(x)}</option>`).join('');
  ['q','statusFilter','regionFilter'].forEach(id=>$('#'+id).addEventListener(id==='q'?'input':'change',render));
  $('#clear').onclick=()=>{$('#q').value='';$('#statusFilter').value='';$('#regionFilter').value='';render();};
  $('#updated').textContent=new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})+' 更新';render();
}
main();
