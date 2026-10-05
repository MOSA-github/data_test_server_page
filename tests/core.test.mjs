import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveReading,fuelPercent,fuelState,formatFuel} from '../docs/assets/core.mjs';

test('direct per-device JSON is accepted without ID matching',()=>{
  const payload={schema_version:1,id:'demo-fuel',facility_id:'DEMO',device_id:'demo-fuel',status:'normal',value:73.448,unit:'%',percent:73.45};
  const r=resolveReading(payload,{id:'HOSP-0001'},{id:'anything'});
  assert.equal(r.value,73.448);
});

test('aggregate readings JSON is intentionally rejected',()=>{
  const payload={readings:[{status:'normal',value:73.448,unit:'%'}]};
  assert.equal(resolveReading(payload),null);
});

test('percent comes from source reading',()=>{assert.equal(fuelPercent({}, {value:3178,unit:'L',percent:70.63}),70.63)});
test('default warning thresholds use source percent',()=>{assert.equal(fuelState({}, {status:'normal',value:20,unit:'%',percent:20}).level,'warning');assert.equal(fuelState({}, {status:'normal',value:10,unit:'%',percent:10}).level,'critical')});
test('formats source unit and percent',()=>{assert.match(formatFuel({}, {status:'normal',value:3178.322,unit:'L',percent:70.63}),/3,178\.3 L（70\.6%）/)});
