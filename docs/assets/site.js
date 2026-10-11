const catalogUrl = "public-data/catalog.json";

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
    return url.protocol === "https:" ? url : null;
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

  if (count) count.textContent = `${total} dataset${total === 1 ? "" : "s"}`;
  if (updated) updated.textContent = data.generated_at || "—";
  if (!rows) return;

  rows.replaceChildren();
  if (!total) {
    rows.closest(".table-shell").hidden = true;
    if (empty) empty.hidden = false;
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
    const status = textElement("span", "PUBLIC", "badge badge-public");
    const statusCell = document.createElement("td");
    statusCell.append(status);

    if (document.body.dataset.page === "data") {
      row.append(nameCell, textElement("td", item.format || "—"), endpointCell, textElement("td", item.update_frequency || "—"), statusCell);
    } else {
      row.append(nameCell, textElement("td", item.format || "—"), textElement("td", item.update_frequency || "—"), statusCell, endpointCell);
    }
    rows.append(row);
  }
}

function renderCatalogError() {
  const count = document.querySelector("#datasetCount");
  const rows = document.querySelector("#datasetRows");
  if (count) count.textContent = "Unavailable";
  if (!rows) return;
  rows.replaceChildren();
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.append(textElement("span", "CATALOG ERROR", "badge badge-error"), document.createTextNode("  Public catalog unavailable"));
  const row = document.createElement("tr");
  row.append(cell);
  rows.append(row);
}

if (document.querySelector("#datasetRows")) {
  loadCatalog().then(renderCatalog).catch(renderCatalogError);
}
