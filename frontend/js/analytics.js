async function loadAnalytics() {
  setStatus("olapDashboardStatus", "Loading OLAP warehouse data...");

  const requests = {
    summary: apiRequest("/api/olap/summary"),
    maintenanceCost: apiRequest("/api/olap/maintenance-cost?limit=8"),
    failureTrend: apiRequest("/api/olap/failure-trend"),
    riskMatrix: apiRequest("/api/olap/risk-matrix"),
    btreeIndexes: apiRequest("/api/olap/btree-indexes"),
    rollup: apiRequest("/api/olap/maintenance-cost-rollup"),
    schemaComparison: apiRequest("/api/olap/schema-comparison")
  };

  const settledEntries = await Promise.all(
    Object.entries(requests).map(async ([key, request]) => [key, await Promise.resolve(request).then(
      data => ({ ok: true, data }),
      error => ({ ok: false, error })
    )])
  );
  const results = Object.fromEntries(settledEntries);
  const failedResults = Object.entries(results).filter(([, result]) => !result.ok);

  const summary = results.summary.ok ? results.summary.data : {};
  const maintenanceCost = results.maintenanceCost.ok ? results.maintenanceCost.data : [];
  const failureTrend = results.failureTrend.ok ? results.failureTrend.data : [];
  const riskMatrix = results.riskMatrix.ok ? results.riskMatrix.data : [];
  const btreeIndexes = results.btreeIndexes.ok ? results.btreeIndexes.data : {};
  const rollup = results.rollup.ok ? results.rollup.data : [];
  const schemaComparison = results.schemaComparison.ok ? results.schemaComparison.data : null;

  document.getElementById("warehouseDevices").textContent = summary.warehouse_devices ?? 0;
  document.getElementById("failureFactRows").textContent = summary.failure_fact_rows ?? 0;
  document.getElementById("maintenanceFactRows").textContent = summary.maintenance_fact_rows ?? 0;
  document.getElementById("warehouseMaintenanceCost").textContent = formatMoney(summary.total_maintenance_cost);

  renderOlapCostTable(maintenanceCost || []);
  renderOlapCostBars(maintenanceCost || []);
  renderFailureTrendChart(failureTrend || []);
  renderRiskMatrixChart(riskMatrix || []);
  renderBtreeIndexTable(btreeIndexes?.tables || {});
  renderRollupTable(rollup || []);
  renderSchemaComparison(schemaComparison || null);

  if (failedResults.length) {
    setStatus(
      "olapDashboardStatus",
      `Some analytics data could not load: ${failedResults.map(([key]) => key).join(", ")}. Run the full database initializer if this persists.`,
      "error"
    );
    return;
  }

  setStatus(
    "olapDashboardStatus",
    "Analytics warehouse loaded. B+ tree index metadata is available for OLTP and warehouse tables."
  );
}

function formatCompactNumber(value) {
  const number = Number(value || 0);

  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return String(Math.round(number));
}

function renderOlapCostTable(rows) {
  const table = document.getElementById("olapCostTable");

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="4">No OLAP cost summary available.</td></tr>`;
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td>${row.manufacturer_name || "-"}</td>
      <td>${row.type_name || "-"}</td>
      <td>${row.maintenance_records ?? 0}</td>
      <td>${formatMoney(row.total_maintenance_cost)}</td>
    </tr>
  `).join("");
}

function renderOlapCostBars(rows) {
  const chart = document.getElementById("olapCostBars");

  if (!rows.length) {
    chart.innerHTML = `<p class="muted">No OLAP cost chart available.</p>`;
    return;
  }

  const maxCost = Math.max(...rows.map(row => Number(row.total_maintenance_cost || 0)), 1);

  chart.innerHTML = rows.slice(0, 6).map(row => {
    const totalCost = Number(row.total_maintenance_cost || 0);
    const width = Math.max((totalCost / maxCost) * 100, 3);

    return `
      <div class="chart-row">
        <div class="chart-row-label">
          <strong>${row.manufacturer_name || "-"}</strong>
          <span>${row.type_name || "-"}</span>
        </div>
        <div class="chart-bar-track" aria-label="${formatMoney(totalCost)}">
          <div class="chart-bar-fill" style="width:${width}%"></div>
        </div>
        <span class="chart-value">${formatCompactNumber(totalCost)}</span>
      </div>
    `;
  }).join("");
}

function renderFailureTrendChart(rows) {
  const chart = document.getElementById("failureTrendChart");

  if (!rows.length) {
    chart.innerHTML = `<p class="muted">No failure trend data available.</p>`;
    return;
  }

  const trendMap = new Map();

  rows.forEach(row => {
    const year = Number(row.year_number);
    const quarter = Number(row.quarter_number);

    if (!year || !quarter) return;

    const key = `${year} Q${quarter}`;
    const existing = trendMap.get(key) || {
      label: key,
      sort: year * 10 + quarter,
      total: 0
    };

    existing.total += Number(row.total_failure_events || 0);
    trendMap.set(key, existing);
  });

  const points = [...trendMap.values()]
    .sort((a, b) => a.sort - b.sort)
    .slice(-10);

  if (!points.length) {
    chart.innerHTML = `<p class="muted">No failure trend data available.</p>`;
    return;
  }

  const width = 640;
  const height = 260;
  const padding = 34;
  const maxValue = Math.max(...points.map(point => point.total), 1);
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coordinates = points.map((point, index) => {
    const x = points.length > 1 ? padding + index * step : width / 2;
    const y = height - padding - (point.total / maxValue) * (height - padding * 2);
    return { ...point, x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${height - padding} L ${coordinates[0].x.toFixed(1)} ${height - padding} Z`;

  chart.innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Failure trend line graph">
      <line class="axis-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}"></line>
      <line class="axis-line" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}"></line>
      <path class="trend-area" d="${areaPath}"></path>
      <path class="trend-line" d="${path}"></path>
      ${coordinates.map(point => `
        <g>
          <circle class="trend-dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5"></circle>
          <text class="trend-value" x="${point.x.toFixed(1)}" y="${Math.max(point.y - 12, 18).toFixed(1)}">${point.total}</text>
        </g>
      `).join("")}
      ${coordinates.map((point, index) => index % 2 === 0 || index === coordinates.length - 1 ? `
        <text class="trend-label" x="${point.x.toFixed(1)}" y="${height - 8}">${point.label}</text>
      ` : "").join("")}
    </svg>
  `;
}

function renderRiskMatrixChart(rows) {
  const chart = document.getElementById("riskMatrixChart");

  if (!rows.length) {
    chart.innerHTML = `<p class="muted">No risk matrix data available.</p>`;
    return;
  }

  const riskLevels = ["Critical", "High", "Medium", "Low"];
  const priorities = ["Critical", "High", "Medium", "Low"];
  const matrix = new Map();
  const maxCost = Math.max(...rows.map(row => Number(row.total_maintenance_cost || 0)), 1);

  rows.forEach(row => {
    matrix.set(`${row.risk_status}:${row.maintenance_priority}`, row);
  });

  chart.innerHTML = `
    <div class="matrix-grid">
      <div class="matrix-corner"></div>
      ${priorities.map(priority => `<div class="matrix-heading">${priority}</div>`).join("")}
      ${riskLevels.map(risk => `
        <div class="matrix-heading row-heading">${risk}</div>
        ${priorities.map(priority => {
          const row = matrix.get(`${risk}:${priority}`);
          const totalCost = Number(row?.total_maintenance_cost || 0);
          const intensity = Math.max(totalCost / maxCost, 0.08);

          return `
            <div class="matrix-cell" style="--heat:${intensity.toFixed(2)}">
              <strong>${formatCompactNumber(totalCost)}</strong>
              <span>${row?.devices ?? 0} devices</span>
            </div>
          `;
        }).join("")}
      `).join("")}
    </div>
  `;
}

function renderBtreeIndexTable(tables) {
  const table = document.getElementById("btreeIndexTable");
  const groupedIndexes = [];

  Object.entries(tables).forEach(([tableName, rows]) => {
    const byIndex = new Map();

    rows.forEach(row => {
      const key = `${tableName}:${row.index_name}`;
      const existing = byIndex.get(key) || {
        table_name: tableName,
        index_name: row.index_name,
        columns: []
      };

      existing.columns.push(row.column_name);
      byIndex.set(key, existing);
    });

    groupedIndexes.push(...byIndex.values());
  });

  if (!groupedIndexes.length) {
    table.innerHTML = `<tr><td colspan="3">No B+ tree index metadata available.</td></tr>`;
    return;
  }

  table.innerHTML = groupedIndexes.slice(0, 12).map(row => `
    <tr>
      <td>${row.table_name}</td>
      <td>${row.index_name}</td>
      <td>${row.columns.join(", ")}</td>
    </tr>
  `).join("");
}

function renderRollupTable(rows) {
  const table = document.getElementById("rollupTable");

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="4">No roll-up data available.</td></tr>`;
    return;
  }

  table.innerHTML = rows.map(row => {
    const rowClass = row.row_level === "grand_total"
      ? "rollup-grand-total"
      : row.row_level === "subtotal"
        ? "rollup-subtotal"
        : "";

    return `
      <tr class="${rowClass}">
        <td>${row.rollup_label}</td>
        <td>${row.maintenance_records ?? 0}</td>
        <td>${formatMoney(row.total_maintenance_cost)}</td>
        <td>${formatMoney(row.avg_maintenance_cost)}</td>
      </tr>
    `;
  }).join("");
}

function renderSchemaComparison(data) {
  const panel = document.getElementById("schemaComparisonPanel");

  if (!data) {
    panel.innerHTML = `<p class="muted">No schema comparison available. Run database/sql/snowflake_variant.sql.</p>`;
    return;
  }

  const equivalenceNote = data.results_identical
    ? `<span class="badge Low">Identical</span> both schemas return the same ${data.row_counts.star_device_rows} devices`
    : `<span class="badge Critical">Mismatch</span> ${data.mismatched_rows} row(s) differ`;

  panel.innerHTML = `
    <div class="schema-comparison-summary">
      <p>${equivalenceNote}</p>
    </div>

    <div class="schema-comparison-grid">
      <div class="schema-comparison-card">
        <h4>Star</h4>
        <p class="muted">${data.star_schema.table_names.join(", ")}</p>
        <ul class="schema-plan-list">
          ${data.star_schema.query_plan.map(step => `
            <li><strong>${step.table || "Plan"}</strong> - type: ${step.type || "-"}, rows: ${step.rows || "-"}</li>
          `).join("")}
        </ul>
      </div>

      <div class="schema-comparison-card">
        <h4>Snowflake</h4>
        <p class="muted">${data.snowflake_schema.table_names.join(", ")}</p>
        <ul class="schema-plan-list">
          ${data.snowflake_schema.query_plan.map(step => `
            <li><strong>${step.table || "Plan"}</strong> - type: ${step.type || "-"}, rows: ${step.rows || "-"}</li>
          `).join("")}
        </ul>
      </div>
    </div>

    <p class="muted schema-comparison-footnote">
      Same count-devices-by-manufacturer query: the star schema reads 1 table,
      the snowflake variant joins ${data.snowflake_schema.tables_involved} tables to reach the same names.
    </p>
  `;
}

function setupAnalyticsQuickNav() {
  const links = [...document.querySelectorAll("[data-section-link]")];

  if (!links.length) return;

  const sections = links
    .map(link => document.getElementById(link.dataset.sectionLink))
    .filter(Boolean);

  function setActive(sectionId) {
    links.forEach(link => {
      link.classList.toggle("active", link.dataset.sectionLink === sectionId);
    });
  }

  if (!("IntersectionObserver" in window)) {
    links.forEach(link => {
      link.addEventListener("click", () => setActive(link.dataset.sectionLink));
    });
    return;
  }

  const observer = new IntersectionObserver(entries => {
    const visibleEntry = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visibleEntry) {
      setActive(visibleEntry.target.id);
    }
  }, {
    rootMargin: "-24% 0px -58% 0px",
    threshold: [0.08, 0.18, 0.32]
  });

  sections.forEach(section => observer.observe(section));
}

setupAnalyticsQuickNav();
loadAnalytics();
