import test from 'node:test';
import assert from 'node:assert/strict';
import {indexFuelReadings,readingKey,fuelPercent,fuelState,formatFuel} from '../docs/assets/core.mjs';

test('matches fuel by facility + device id',()=>{
  const m=indexFuelReadings({readings:[{facility_id:'HOSP-0001',device_id:'fuel-1',status:'normal',value:3178.322,unit:'L',percent:70.63}]});
  assert.equal(m.get(readingKey('HOSP-0001','fuel-1')).value,3178.322);
});
test('computes percent from capacity if payload has no percent',()=>{
  assert.equal(fuelPercent({capacity:4500},{value:2250}),50);
});
test('warning thresholds',()=>{
  const d={warning_percent:30,critical_percent:15,capacity:100};
  assert.equal(fuelState(d,{status:'normal',value:20}).level,'warning');
  assert.equal(fuelState(d,{status:'normal',value:10}).level,'critical');
  assert.equal(fuelState(d,{status:'normal',value:80}).level,'normal');
});
test('formats liters and percent',()=>{
  assert.match(formatFuel({capacity:4500,unit:'L'},{status:'normal',value:3178.322,unit:'L',percent:70.63}),/3,178\.3 L（70\.6%）/);
});
