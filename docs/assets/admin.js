const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let facilities = [];
let editIndex = -1;

async function load(){
  try{
    const r = await fetch('data/facilities.json?t='+Date.now(), {cache:'no-store'});
    facilities = await r.json();
  }catch{ facilities=[]; }
  render();
}

function render(){
  $('#rows').innerHTML = facilities.map((f,i)=>`<tr><td>${esc(f.id)}</td><td>${esc(f.name)}</td><td>${esc(f.prefecture)} ${esc(f.city)}</td><td>${(f.devices||[]).length}</td><td><button data-i="${i}" class="edit">編集</button></td></tr>`).join('');
  document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>openEdit(Number(b.dataset.i)));
}

function autoId(type='device'){
  const f = facilities[editIndex] || {devices:[]};
  const used = new Set([...(f.devices||[]).map(d=>d.id), ...[...document.querySelectorAll('.device-row .did')].map(x=>x.value.trim())].filter(Boolean));
  let n=1;
  while(used.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
}

function directReading(payload){
  if(!payload || typeof payload!=='object' || Array.isArray(payload)) return null;
  if(Array.isArray(payload.readings)) return null;
  if('value' in payload || 'status' in payload) return payload;
  return null;
}

async function testFuelUrl(div){
  const input=div.querySelector('.data_url');
  const out=div.querySelector('.source-preview');
  const raw=input?.value.trim()||'';
  if(!raw){out.textContent='JSON URLを入力してください'; return;}
  let u;
  try{u=new URL(raw);}catch{out.textContent='URLの形式を確認してください';return;}
  if(!['https:','http:'].includes(u.protocol)){out.textContent='http / https のURLを指定してください';return;}
  out.textContent='確認中…';
  try{
    const sep=u.href.includes('?')?'&':'?';
    const r=await fetch(u.href+sep+'t='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw Error(`HTTP ${r.status}`);
    const payload=await r.json();
    if(Array.isArray(payload?.readings)){
      throw Error('一覧JSONです。fuel_level_monitoring_system の「計器JSON URLをコピー」で取得した専用URLを貼ってください。');
    }
    const reading=directReading(payload);
    if(!reading) throw Error('value/status を持つ計器専用JSONではありません。');
    out.textContent=`取得OK：${reading.value??'—'} ${reading.unit??''}${reading.percent!=null?`（${reading.percent}%）`:''}`;
  }catch(e){out.textContent='取得NG：'+(e?.message||'JSONを取得できません');}
}

function deviceRow(d={id:'',name:'',type:'fuel',data_url:'',camera_url:''}){
  const div=document.createElement('div');
  div.className='device-row';
  div.innerHTML=`
    <input class="did" placeholder="設備ID（自由に編集可）" value="${esc(d.id)}">
    <input class="dname" placeholder="表示名・設置場所" value="${esc(d.name)}">
    <select class="dtype">
      <option value="water">水位</option>
      <option value="power">電力</option>
      <option value="generator">発電機</option>
      <option value="fuel">燃料残量</option>
      <option value="camera">カメラ</option>
    </select>
    <div class="type-fields"></div>
    <button type="button" class="remove danger-lite">削除</button>`;
  div.querySelector('.dtype').value=d.type||'fuel';

  const update=()=>{
    const t=div.querySelector('.dtype').value;
    const box=div.querySelector('.type-fields');
    if(t==='fuel'){
      box.innerHTML=`
        <input class="data_url wide" type="url" placeholder="燃料JSON URL（https://.../data/devices/xxx.json）" value="${esc(d.data_url||'')}">
        <button type="button" class="source-test">URL確認</button>
        <span class="source-preview small"></span>`;
      box.querySelector('.source-test').onclick=()=>testFuelUrl(div);
    }else if(t==='camera'){
      box.innerHTML=`<input class="camera_url wide" type="url" placeholder="カメラ表示URL" value="${esc(d.camera_url||'')}">`;
    }else{
      box.innerHTML='<span class="small">追加設定なし</span>';
    }
  };

  div.querySelector('.dtype').onchange=()=>{
    d={};
    const t=div.querySelector('.dtype').value;
    if(!div.querySelector('.did').value.trim()) div.querySelector('.did').value=autoId(t);
    update();
  };
  div.querySelector('.remove').onclick=()=>{
    if(confirm('この設備を削除しますか？')) div.remove();
  };
  update();
  return div;
}

function openEdit(i){
  editIndex=i;
  const f=facilities[i]||{id:'',name:'',prefecture:'',city:'',address:'',latitude:'',longitude:'',status:'normal',devices:[]};
  for(const k of ['fid','fname','pref','city','address','lat','lon']) $('#'+k).value={fid:f.id,fname:f.name,pref:f.prefecture,city:f.city,address:f.address,lat:f.latitude??'',lon:f.longitude??''}[k];
  $('#fstatus').value=f.status||'normal';
  $('#deviceRows').innerHTML='';
  (f.devices||[]).forEach(d=>$('#deviceRows').append(deviceRow({...d})));
  $('#deleteFacility').style.display=f.id?'inline-block':'none';
  $('#modal').classList.add('open');
}

function readDevices(){
  const rows=[...document.querySelectorAll('.device-row')];
  const used=new Set();
  return rows.map(r=>{
    const t=r.querySelector('.dtype').value;
    let id=r.querySelector('.did').value.trim();
    if(!id) id=autoId(t);
    if(used.has(id)) throw new Error(`設備ID「${id}」が重複しています。`);
    used.add(id);
    const d={id,name:r.querySelector('.dname').value.trim(),type:t};
    if(t==='fuel') d.data_url=r.querySelector('.data_url')?.value.trim()||'';
    if(t==='camera') d.camera_url=r.querySelector('.camera_url')?.value.trim()||'';
    return d;
  }).filter(d=>d.id);
}

function close(){ $('#modal').classList.remove('open'); }
function saveDraft(message='ブラウザに変更を保存しました。上の「GitHubへ本番反映」で公開できます。'){
  localStorage.setItem('facilities-draft',JSON.stringify(facilities));
  $('#notice').textContent=message;
  render();
}

$('#add').onclick=()=>{
  facilities.push({id:'',name:'',prefecture:'',city:'',address:'',latitude:null,longitude:null,status:'normal',devices:[]});
  openEdit(facilities.length-1);
};
$('#addDevice').onclick=()=>$('#deviceRows').append(deviceRow({id:autoId('fuel'),name:'',type:'fuel',data_url:''}));
$('#cancel').onclick=()=>{if(!facilities[editIndex]?.id) facilities.splice(editIndex,1);close();render();};
$('#deleteFacility').onclick=()=>{
  const f=facilities[editIndex];if(!f)return;
  if(!confirm(`「${f.name||f.id}」を病院一覧から削除しますか？`))return;
  facilities.splice(editIndex,1);close();saveDraft('病院を削除しました。GitHubへ本番反映すると公開側からも削除されます。');
};
$('#save').onclick=()=>{
  try{
    const f=facilities[editIndex];
    Object.assign(f,{id:$('#fid').value.trim(),name:$('#fname').value.trim(),prefecture:$('#pref').value.trim(),city:$('#city').value.trim(),address:$('#address').value.trim(),latitude:$('#lat').value?Number($('#lat').value):null,longitude:$('#lon').value?Number($('#lon').value):null,status:$('#fstatus').value,devices:readDevices()});
    if(!f.id||!f.name){alert('施設IDと病院名は必須です。');return;}
    const bad=(f.devices||[]).find(d=>d.type==='fuel'&&!d.data_url);
    if(bad&&!confirm(`燃料設備「${bad.name||bad.id}」にJSON URLがありません。このまま保存しますか？`))return;
    close();saveDraft();
  }catch(e){alert(e.message||'設備設定を確認してください。');}
};

$('#export').onclick=()=>{
  const blob=new Blob([JSON.stringify(facilities,null,2)+'\n'],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='facilities.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
};

async function githubApi(path,method='GET',body){
  const token=$('#githubToken').value.trim();
  if(!token) throw new Error('GitHubトークンを入力してください。');
  const r=await fetch(`https://api.github.com/repos/MOSA-github/data_test_server_page/${path}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.message||`GitHub API ${r.status}`);
  return j;
}

$('#publish').onclick=async()=>{
  const b=$('#publish');b.disabled=true;
  try{
    const current=await githubApi('contents/docs/data/facilities.json?ref=main');
    const text=JSON.stringify(facilities,null,2)+'\n';
    const bytes=new TextEncoder().encode(text);let binary='';for(const x of bytes)binary+=String.fromCharCode(x);
    await githubApi('contents/docs/data/facilities.json','PUT',{message:'Update hospitals and device source URLs',branch:'main',sha:current.sha,content:btoa(binary)});
    localStorage.removeItem('facilities-draft');
    $('#notice').textContent='本番反映が完了しました。mainへのcommitまで実行済みです。';
  }catch(e){$('#notice').textContent='反映できませんでした：'+e.message;}
  finally{b.disabled=false;}
};

const draft=localStorage.getItem('facilities-draft');
load().then(()=>{
  if(draft){
    try{facilities=JSON.parse(draft);render();$('#notice').textContent='このブラウザの編集中データを表示しています。設備ID・JSON URL・削除を自由に編集できます。';}catch{}
  }
});
