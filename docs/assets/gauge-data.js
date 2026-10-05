/* Public camera-derived readings. Demo data never becomes a facility measurement. */
(function(root){
const ENDPOINT="https://mosa-github.github.io/fuel_level_monitoring_system/data/latest.json";
function merge(hospitals,payload,now=Date.now()){
  const copy=JSON.parse(JSON.stringify(hospitals));
  for(const r of payload?.readings||[]){
    if(r.is_demo!==false||!["water","generator"].includes(r.type)||typeof r.device_id!=="string")continue;
    const h=copy.find(h=>h.id===r.facility_id);if(!h)continue;
    h.devices=h.devices||[];
    let d=h.devices.find(d=>d.id===r.device_id);
    if(d&&d.type!==r.type)continue;
    if(!d){d={id:r.device_id,type:r.type,name:r.name||r.device_id};h.devices.push(d);}
    const stamp=Date.parse(r.updated_at),interval=Number(r.interval_minutes);
    const stale=!Number.isFinite(stamp)||stamp>now+300000||!Number.isFinite(interval)||now-stamp>Math.max(30,interval*3)*60000;
    const valid=r.status==="normal"&&!stale&&Number.isFinite(r.value);
    Object.assign(d,{value:valid?r.value:null,unit:r.unit||"%",status:valid?"normal":r.status==="disabled"?"offline":"error",updated_at:r.updated_at||null,gauge_id:r.id,gauge_state:valid?"画像解析":r.status==="disabled"?"解析停止中":stale&&r.status==="normal"?"期限切れ":"取得・解析エラー",confidence:r.confidence});
  }
  return copy;
}
async function fetchReadings(){const r=await fetch(ENDPOINT+"?t="+Date.now(),{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error("Gauge data unavailable");const p=await r.json();if(p.schema_version!==1||!Array.isArray(p.readings))throw Error("Invalid gauge data");return p;}
const api={merge,fetchReadings,ENDPOINT};root.GaugeData=api;if(typeof module!=="undefined")module.exports=api;
})(globalThis);
