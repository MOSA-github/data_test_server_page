// The public catalog is the only entry point; join by facility_id and sensor_id.
export async function loadApprovedSensors(catalogUrl=new URL('../public-data/catalog.json',import.meta.url)){
  const catalogLocation=new URL(catalogUrl,import.meta.url);
  const get=async url=>{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`公開データ取得失敗: ${response.status}`);return response.json()};
  const catalog=await get(catalogLocation);
  const dataset=async id=>{const spec=catalog.datasets.find(d=>d.id===id);if(!spec)return [];const url=new URL(spec.url,catalogLocation);if(url.origin!==catalogLocation.origin||!url.pathname.startsWith(catalogLocation.pathname.replace(/catalog\.json$/,'')))throw new Error('未承認データURL');return get(url)};
  const [latest,locations,cameras]=await Promise.all([dataset('latest'),dataset('locations'),dataset('cameras')]);
  const master=new Map(locations.map(l=>[l.facility_id,l]));
  return [...latest,...cameras].flatMap(row=>{const place=master.get(row.facility_id)||(row.type==='camera'?row:null);if(!place||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)||Math.abs(place.latitude)>90||Math.abs(place.longitude)>180)return [];
    let images=[];if(row.image_url){const image=new URL(row.image_url,catalogLocation),imageRoot=catalogLocation.pathname.replace(/catalog\.json$/,'')+'images/';if(image.origin!==catalogLocation.origin||!image.pathname.startsWith(imageRoot)||! /^[a-f0-9]{32}\.(png|jpg)$/.test(image.pathname.slice(imageRoot.length))||image.search||image.hash||image.username||image.password)throw new Error('未承認画像URL');images=[{id:row.sensor_id,name:row.name,status:row.status,image_url:image.href,updated_at:row.measured_at}]}
    return [{id:row.sensor_id,sensor_id:row.sensor_id,facility_id:row.facility_id,name:row.name,type:row.type,value:row.value??null,unit:row.unit||'',status:row.status,updated_at:row.measured_at,lat:place.latitude,lng:place.longitude,facility:{id:row.facility_id,name:place.facility_name||place.name||''},cameras:images}];});
}

export function updatePoiLayer(svgDocument,sensors,iconUrl,svgMap){
  const root=svgDocument.getElementById('sensor-root');if(!root)throw new Error('sensor-rootがありません');
  root.replaceChildren();
  for(const sensor of sensors){const poi=svgDocument.createElementNS('http://www.w3.org/2000/svg','image');
    poi.setAttribute('href',iconUrl);poi.setAttribute('x','-12');poi.setAttribute('y','-12');poi.setAttribute('width','24');poi.setAttribute('height','24');
    poi.setAttribute('transform',`ref(svg,${sensor.lng},${-sensor.lat})`);poi.setAttribute('data-mosademy','true');poi.setAttribute('data-sensor-id',sensor.id);
    poi.setAttribute('title',sensor.name||sensor.id);
    poi.setAttribute('content',[`id=${encodeURIComponent(sensor.id)}`,`name=${encodeURIComponent(sensor.name)}`,`facility_id=${encodeURIComponent(sensor.facility.id)}`,`facility_name=${encodeURIComponent(sensor.facility.name)}`,`type=${sensor.type}`,`status=${sensor.status}`,`value=${sensor.value??''}`,`unit=${encodeURIComponent(sensor.unit)}`,`updated_at=${encodeURIComponent(sensor.updated_at)}`,`cameras=${encodeURIComponent(JSON.stringify(sensor.cameras))}`].join(','));root.appendChild(poi);}
  // Existing SVGMap API, also used in MOSAdemy_SVGMap/js/live_sensor_layer.js.
  svgMap.refreshScreen();
}

export function showSensor(container,sensor){
  container.replaceChildren();const label=document.createElement('p'),date=new Date(sensor.updated_at);
  const stamp=sensor.updated_at&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date)+'（日本時間）':'—';
  label.textContent=`${sensor.facility?.name?`${sensor.facility.name} / `:''}${sensor.name}: ${sensor.value??'—'} ${sensor.unit} / ${stamp}`;container.append(label);
  for(const camera of sensor.cameras){const image=document.createElement('img');image.src=camera.image_url;image.alt=camera.name;image.style.maxWidth='100%';image.style.objectFit='contain';container.append(image)}
}
