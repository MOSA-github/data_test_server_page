import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReadings,resolveReading,fuelPercent,fuelState,formatFuel} from '../docs/assets/core.mjs';

test('single-reading URL needs no matching IDs',()=>{
  const payload={readings:[{id:'demo-fuel',facility_id:'DEMO',device_id:'demo-fuel',status:'normal',value:73.448,unit:'%',percent:73.45}]};
  const r=resolveReading(payload,{id:'HOSP-0001'},{id:'fuel-1',type:'fuel'});
  assert.equal(r.value,73.448);
});
test('multi-reading URL matches facility + device',()=>{
  const payload={readings:[{facility_id:'A',device_id:'x',value:1},{facility_id:'HOSP-0001',device_id:'fuel-1',value:2}]};
  assert.equal(resolveReading(payload,{id:'HOSP-0001'},{id:'fuel-1'}).value,2);
});
test('direct reading object is accepted',()=>{assert.equal(normalizeReadings({status:'normal',value:55,unit:'%'}).length,1)});
test('percent comes from source reading',()=>{assert.equal(fuelPercent({}, {value:3178,unit:'L',percent:70.63}),70.63)});
test('default warning thresholds use source percent',()=>{assert.equal(fuelState({}, {status:'normal',value:20,unit:'%',percent:20}).level,'warning');assert.equal(fuelState({}, {status:'normal',value:10,unit:'%',percent:10}).level,'critical')});
test('formats source unit and percent',()=>{assert.match(formatFuel({}, {status:'normal',value:3178.322,unit:'L',percent:70.63}),/3,178\.3 L（70\.6%）/)});
