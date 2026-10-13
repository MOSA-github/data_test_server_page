const catalogUrl = "public-data/catalog.json";
const publicDataRoot = new URL("public-data/", window.location.href);
const refreshIntervalMs = 180000;
let refreshInProgress = false;

async function loadCatalog() {
  const response = await fetch(`${catalogUrl}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.schema_version !== 1 || !Array.isArray(data.datasets)) {
    throw new Error("Unexpected response format");
  }
  return data;
}

function textElement(name, value, className) {
  const element = document.createElement(name);
  element.textContent = String(value ?? "");
  if (className) element.className = className;
  return element;
}

function safePublicUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function renderCatalog(data) {
  const count = document.querySelector("#datasetCount");
  const rows = document.querySelector("#datasetRows");
  const empty = document.querySelector("#datasetEmpty");
  const updated = document.querySelector("#lastUpdated");
  const total = data.datasets.length;

  if (count) count.textContent = `${total}件`;
  if (updated) updated.textContent = data.generated_at || "—";
  if (!rows) return;

  rows.replaceChildren();
  rows.closest(".table-shell").hidden = !total;
  if (empty) empty.hidden = Boolean(total);
  if (!total) {
    return;
  }

  for (const item of data.datasets) {
    const url = safePublicUrl(item.url);
    if (!url) continue;
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.append(
      textElement("span", item.name || item.id, "dataset-name"),
      textElement("span", item.description || "", "dataset-description")
    );
    const endpoint = document.createElement("a");
    endpoint.className = "endpoint-link";
    endpoint.href = url.href;
    endpoint.textContent = url.pathname;
    const endpointCell = document.createElement("td");
    endpointCell.append(endpoint);
    const status = textElement("span", "公開", "badge badge-public");
    const statusCell = document.createElement("td");
    statusCell.append(status);

    const refresh = Number.isFinite(item.refresh_seconds) && item.refresh_seconds > 0
      ? `${item.refresh_seconds}秒` : item.update_frequency || "—";
    if (document.body.dataset.page === "data") {
      row.append(nameCell, textElement("td", item.format || "—"), endpointCell, textElement("td", refresh), statusCell);
    } else {
      row.append(nameCell, textElement("td", item.format || "—"), textElement("td", refresh), statusCell, endpointCell);
    }
    rows.append(row);
  }
}

function renderCatalogError() {
  const count = document.querySelector("#datasetCount");
  const rows = document.querySelector("#datasetRows");
  if (count) count.textContent = "取得エラー";
  if (!rows) return;
  rows.closest(".table-shell").hidden = false;
  const empty = document.querySelector("#datasetEmpty");
  if (empty) empty.hidden = true;
  rows.replaceChildren();
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.append(textElement("span", "取得エラー", "badge badge-error"), document.createTextNode("  公開カタログを取得できません"));
  const row = document.createElement("tr");
  row.append(cell);
  rows.append(row);
}

function publicArtifactUrl(value, image = false) {
  const url = safePublicUrl(value);
  if (!url || url.origin !== publicDataRoot.origin || url.search || url.hash ||
      !url.pathname.startsWith(publicDataRoot.pathname)) return null;
  const relative = url.pathname.slice(publicDataRoot.pathname.length);
  return (image ? /^images\/[a-f0-9]{32}\.(png|jpg)$/ : /^(latest|cameras)\.json$/).test(relative) ? url : null;
}

async function loadPublicRecords(catalog, id) {
  const dataset = catalog.datasets.find(item => item.id === id);
  // Empty datasets are deliberately omitted from the generated catalog.
  if (!dataset) return [];
  const url = publicArtifactUrl(dataset.url);
  if (!url || !url.pathname.endsWith(`/${id}.json`)) throw new Error("Invalid public dataset");
  url.searchParams.set("t", Date.now());
  const response = await fetch(url.href, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error("Public dataset unavailable");
  const records = await response.json();
  if (!Array.isArray(records) || records.some(record => !record || typeof record !== "object" || Array.isArray(record))) {
    throw new Error("Invalid public records");
  }
  return records;
}

function recordMetadata(record) {
  const metadata = textElement("p", `施設ID: ${record.facility_id ?? "—"} / センサID: ${record.sensor_id ?? "—"}`, "record-meta");
  const date = new Date(record.measured_at);
  const stamp = record.measured_at && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(date) : "—";
  const time = textElement("time", `計測: ${stamp}（日本時間）`, "record-meta");
  if (stamp !== "—") time.dateTime = record.measured_at;
  return [metadata, time];
}

function renderMeasurements(records) {
  const statuses = { normal: "正常", offline: "オフライン", warning: "警告", error: "エラー" };
  for (const group of document.querySelectorAll("[data-sensor-type]")) {
    const container = group.querySelector(".sensor-records");
    container.replaceChildren();
    const matching = records.filter(record => record.type === group.dataset.sensorType);
    if (!matching.length) container.append(textElement("p", "データなし", "data-message"));
    for (const record of matching) {
      const card = document.createElement("article");
      card.className = "sensor-record";
      const value = typeof record.value === "number" && Number.isFinite(record.value)
        ? `${record.value.toLocaleString("ja-JP", { maximumFractionDigits: 6 })} ${record.unit || ""}`.trim() : "データなし";
      const status = textElement("span", statuses[record.status] || "不明", `badge ${record.status === "normal" ? "badge-public" : "badge-neutral"}`);
      card.append(textElement("h4", record.name || record.sensor_id), textElement("p", value, "sensor-value"), status, ...recordMetadata(record));
      container.append(card);
    }
  }
}

function renderCameras(records) {
  const container = document.querySelector("#cameraImages");
  if (!container) return;
  container.replaceChildren();
  document.querySelector("#cameraCount").textContent = `${records.length}件`;
  if (!records.length) container.append(textElement("p", "データなし", "data-message"));
  for (const record of records) {
    const card = document.createElement("article");
    card.className = "camera-card";
    const frame = document.createElement("div");
    frame.className = "camera-frame";
    const url = publicArtifactUrl(record.image_url, true);
    if (url) {
      const image = document.createElement("img");
      image.alt = record.name || `カメラ ${record.sensor_id}`;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => frame.replaceChildren(textElement("p", "画像を取得できません", "data-message")), { once: true });
      // The generated image path is stable; change its cache key with the snapshot.
      url.searchParams.set("t", record.measured_at || Date.now());
      image.src = url.href;
      frame.append(image);
    } else {
      frame.append(textElement("p", "画像を取得できません", "data-message"));
    }
    const info = document.createElement("div");
    info.className = "camera-info";
    info.append(textElement("h3", record.name || record.sensor_id), ...recordMetadata(record));
    card.append(frame, info);
    container.append(card);
  }
}

function renderOverviewError(selector) {
  for (const container of document.querySelectorAll(selector)) {
    container.replaceChildren(textElement("p", "取得エラー：公開データを読み込めません", "data-message data-error"));
  }
  const count = document.querySelector("#cameraCount");
  if (selector === "#cameraImages" && count) count.textContent = "取得エラー";
}

async function loadOverview(catalog) {
  if (!document.querySelector("#measurementGroups")) return true;
  const results = await Promise.all([
    loadPublicRecords(catalog, "latest").then(records => { renderMeasurements(records); return true; }).catch(() => {
      if (!document.querySelector(".sensor-record")) renderOverviewError(".sensor-records");
      return false;
    }),
    loadPublicRecords(catalog, "cameras").then(records => { renderCameras(records); return true; }).catch(() => {
      if (!document.querySelector(".camera-card")) renderOverviewError("#cameraImages");
      return false;
    })
  ]);
  return results.every(Boolean);
}

async function refreshPublicPage() {
  if (refreshInProgress) return;
  refreshInProgress = true;
  const state = document.querySelector("#pageRefreshState");
  try {
    const data = await loadCatalog();
    renderCatalog(data);
    const succeeded = await loadOverview(data);
    if (state) state.textContent = succeeded ? "3分ごとに自動更新" : "更新失敗：再取得を待機";
  } catch {
    renderCatalogError();
    if (!document.querySelector(".sensor-record")) renderOverviewError(".sensor-records");
    if (!document.querySelector(".camera-card")) renderOverviewError("#cameraImages");
    if (state) state.textContent = "更新失敗：再取得を待機";
  } finally {
    refreshInProgress = false;
  }
}

if (document.querySelector("#datasetRows")) {
  refreshPublicPage();
  setInterval(() => { if (!document.hidden) refreshPublicPage(); }, refreshIntervalMs);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshPublicPage(); });
}
