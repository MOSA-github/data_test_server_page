const {test}=require('node:test'),assert=require('node:assert/strict');
const {merge}=require('../docs/assets/gauge-data.js');
const hospitals=[{id:'H',devices:[{id:'water-1',type:'water',value:99}]}];
const now=Date.parse('2026-10-05T14:00:00Z');
const row={id:'g1',facility_id:'H',device_id:'water-1',type:'water',is_demo:false,status:'normal',value:0,unit:'%',interval_minutes:5,updated_at:'2026-10-05T14:00:00Z'};
test('valid zero replaces existing value without modifying master',()=>{assert.equal(merge(hospitals,{readings:[row]},now)[0].devices[0].value,0);assert.equal(hospitals[0].devices[0].value,99);});
test('demo never becomes real data',()=>assert.equal(merge(hospitals,{readings:[{...row,is_demo:true}]},now)[0].devices[0].value,99));
test('stale/failed/disabled never preserve previous value',()=>{for(const patch of [{updated_at:'2026-10-01T00:00:00Z'},{status:'error'},{status:'disabled'}])assert.equal(merge(hospitals,{readings:[{...row,...patch}]},now)[0].devices[0].value,null);});
test('unknown facility and type conflicts are ignored',()=>{assert.equal(merge(hospitals,{readings:[{...row,facility_id:'X'}]},now)[0].devices[0].value,99);assert.equal(merge(hospitals,{readings:[{...row,type:'generator'}]},now)[0].devices[0].value,99);});
