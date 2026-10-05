export const DEVICE_TYPES = {
  water: '水位',
  power: '電力',
  generator: '発電機',
  fuel: '燃料残量',
  camera: 'カメラ'
};

export function readingKey(facilityId, deviceId) {
  return `${facilityId}::${deviceId}`;
}

export function normalizeReadings(payload) {
  if (Array.isArray(payload)) return payload.filter(x => x && typeof x === 'object');
  if (Array.isArray(payload?.readings)) return payload.readings.filter(x => x && typeof x === 'object');
  if (payload && typeof payload === 'object' && ('value' in payload || 'status' in payload)) return [payload];
  return [];
}

export function resolveReading(payload, facility, device) {
  const rows = normalizeReadings(payload);
  if (!rows.length) return null;
  // URLが1計器だけを返す場合は、ID合わせを利用者に要求しない。
  if (rows.length === 1) return rows[0];
  // 複数計器を含むURLでは、設備IDまたは facility_id + device_id で選ぶ。
  const sourceId = String(device?.source_reading_id || '').trim();
  if (sourceId) {
    const x = rows.find(r => String(r.id ?? '') === sourceId || String(r.device_id ?? '') === sourceId);
    if (x) return x;
  }
  const exact = rows.find(r => String(r.facility_id ?? '') === String(facility?.id ?? '') && String(r.device_id ?? '') === String(device?.id ?? ''));
  if (exact) return exact;
  return rows.find(r => String(r.id ?? '') === String(device?.id ?? '') || String(r.device_id ?? '') === String(device?.id ?? '')) || null;
}

export function fuelPercent(_device, reading) {
  if (Number.isFinite(Number(reading?.percent))) return Number(reading.percent);
  if (String(reading?.unit ?? '').trim() === '%' && Number.isFinite(Number(reading?.value))) return Number(reading.value);
  return null;
}

export function fuelState(device, reading) {
  if (!reading || reading.status === 'error' || reading.status === 'disabled' || reading.value == null) return {level:'nodata', label:'データなし'};
  const p = fuelPercent(device, reading);
  if (p == null) return {level:'normal', label:'取得済み'};
  const critical = Number.isFinite(Number(device?.critical_percent)) ? Number(device.critical_percent) : 15;
  const warning = Number.isFinite(Number(device?.warning_percent)) ? Number(device.warning_percent) : 30;
  if (p <= critical) return {level:'critical', label:'危険'};
  if (p <= warning) return {level:'warning', label:'要確認'};
  return {level:'normal', label:'正常'};
}

export function formatFuel(device, reading) {
  if (!reading || reading.status === 'error' || reading.status === 'disabled' || reading.value == null) return 'データなし';
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
