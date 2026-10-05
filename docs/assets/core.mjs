export const DEVICE_TYPES = {
  water: '水位',
  power: '電力',
  generator: '発電機',
  fuel: '燃料',
  camera: 'カメラ'
};

export function normalizeFuelReadings(payload) {
  const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.readings) ? payload.readings : []);
  return rows.filter(r => r && typeof r.facility_id === 'string' && typeof r.device_id === 'string');
}

export function readingKey(facilityId, deviceId) {
  return `${facilityId}::${deviceId}`;
}

export function indexFuelReadings(payload) {
  const m = new Map();
  for (const r of normalizeFuelReadings(payload)) m.set(readingKey(r.facility_id, r.device_id), r);
  return m;
}

export function fuelPercent(device, reading) {
  if (Number.isFinite(Number(reading?.percent))) return Number(reading.percent);
  const value = Number(reading?.value);
  const cap = Number(device?.capacity);
  if (Number.isFinite(value) && Number.isFinite(cap) && cap > 0) return value / cap * 100;
  return null;
}

export function fuelState(device, reading) {
  if (!reading || reading.status !== 'normal' || reading.value == null) return {level:'nodata', label:'データなし'};
  const p = fuelPercent(device, reading);
  if (p == null) return {level:'normal', label:'取得済み'};
  const critical = Number.isFinite(Number(device?.critical_percent)) ? Number(device.critical_percent) : 15;
  const warning = Number.isFinite(Number(device?.warning_percent)) ? Number(device.warning_percent) : 30;
  if (p <= critical) return {level:'critical', label:'危険'};
  if (p <= warning) return {level:'warning', label:'要確認'};
  return {level:'normal', label:'正常'};
}

export function formatFuel(device, reading) {
  if (!reading || reading.status !== 'normal' || reading.value == null) return 'データなし';
  const unit = reading.unit || device?.unit || '';
  const value = Number(reading.value);
  const v = Number.isFinite(value) ? value.toLocaleString('ja-JP', {maximumFractionDigits:1}) : String(reading.value);
  const p = fuelPercent(device, reading);
  return p == null ? `${v} ${unit}`.trim() : `${v} ${unit}（${p.toFixed(1)}%）`;
}

export function countByType(devices, type) {
  return (devices || []).filter(d => d.type === type).length;
}

export function findLatestPower(latest, facilityId) {
  const rows = Array.isArray(latest) ? latest : [];
  const matches = rows.filter(x => x && x.id === facilityId && Number.isFinite(Number(x.power_w)));
  if (!matches.length) return null;
  return Number(matches[matches.length - 1].power_w);
}
