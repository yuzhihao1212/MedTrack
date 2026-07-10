async function loadDashboard() {
  setStatus("dashboardStatus", "Loading dashboard data...");

  try {
    const [summary, failureSummary, highRiskDevices, riskRanking] = await Promise.all([
      apiRequest("/api/dashboard"),
      apiRequest("/api/failures/summary"),
      apiRequest("/api/devices/high-risk"),
      apiRequest("/api/dashboard/risk-ranking?limit=10")
    ]);

    document.getElementById("totalDevices").textContent = summary.total_devices ?? 0;
    document.getElementById("unresolvedFailures").textContent = summary.unresolved_failures ?? 0;
    document.getElementById("highRiskDevices").textContent = summary.high_risk_devices ?? 0;
    document.getElementById("completedMaintenance").textContent = summary.completed_maintenance ?? 0;
    document.getElementById("avgMaintenanceCost").textContent = formatMoney(summary.avg_maintenance_cost);

    renderFailureBars(failureSummary || []);
    renderHighRiskTable((highRiskDevices || []).slice(0, 8));
    renderRiskRankingTable(riskRanking || []);
    await loadOlapDashboard();

    setStatus("dashboardStatus", "Dashboard loaded successfully.");
  } catch (error) {
    setStatus("dashboardStatus", error.message, "error");
  }
}

function renderFailureBars(rows) {
  const container = document.getElementById("failureSummaryBars");

  if (!rows.length) {
    container.innerHTML = `<p class="muted">No failure summary available.</p>`;
    return;
  }

  const max = Math.max(...rows.map(row => Number(row.total_failure_events || 0)), 1);

  container.innerHTML = rows.map(row => {
    const total = Number(row.total_failure_events || 0);
    const width = Math.max((total / max) * 100, 4);

    return `
      <div class="bar-item">
        <div class="bar-label">
          <span>${row.type_name}</span>
          <span>${total} events</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
      </div>
    `;
  }).join("");
}

function renderHighRiskTable(rows) {
  const table = document.getElementById("highRiskTable");

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="3">No high-risk devices found.</td></tr>`;
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td>${row.device_code}</td>
      <td>${row.type_name}</td>
      <td>${badge(row.risk_status)}</td>
    </tr>
  `).join("");
}

function renderRiskRankingTable(rows) {
  const table = document.getElementById("riskRankingTable");

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="9">No predictive risk ranking available. Run the MySQL views script first.</td></tr>`;
    return;
  }

  table.innerHTML = rows.map((row, index) => {
    const rankClass = index < 3 ? "rank-pill top-rank" : "rank-pill";
    const downtime = Number(row.downtime_hours || 0).toFixed(2);
    const riskScore = Number(row.risk_score || 0).toFixed(2);

    return `
      <tr>
        <td><span class="${rankClass}">#${index + 1}</span></td>
        <td>
          <strong>${row.device_code}</strong>
          <small class="table-subtext">${row.manufacturer_name || ""}</small>
        </td>
        <td>${row.type_name || "-"}</td>
        <td>${row.failure_event_count ?? 0}</td>
        <td>${downtime} hrs</td>
        <td>${badge(row.maintenance_priority || "-")}</td>
        <td><strong>${riskScore}</strong></td>
        <td>${badge(row.predicted_risk_level || "-")}</td>
        <td>${row.recommended_action || "-"}</td>
      </tr>
    `;
  }).join("");
}

async function loadOlapDashboard() {
  setStatus("olapDashboardStatus", "Loading OLAP warehouse data...");

  try {
    const [summary, maintenanceCost, failureTrend, riskMatrix, btreeIndexes, rollup, schemaComparison] = await Promise.all([
      apiRequest("/api/olap/summary"),
      apiRequest("/api/olap/maintenance-cost?limit=8"),
      apiRequest("/api/olap/failure-trend"),
      apiRequest("/api/olap/risk-matrix"),
      apiRequest("/api/olap/btree-indexes"),
      apiRequest("/api/olap/maintenance-cost-rollup"),
      apiRequest("/api/olap/schema-comparison")
    ]);

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

    setStatus(
      "olapDashboardStatus",
      "OLAP warehouse loaded. B+ tree index metadata is available for OLTP and warehouse tables."
    );
  } catch (error) {
    renderOlapCostTable([]);
    renderOlapCostBars([]);
    renderFailureTrendChart([]);
    renderRiskMatrixChart([]);
    renderBtreeIndexTable({});
    renderRollupTable([]);
    renderSchemaComparison(null);
    setStatus("olapDashboardStatus", error.message, "error");
  }
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
            <li><strong>${step.table}</strong> — type: ${step.type}, rows: ${step.rows}</li>
          `).join("")}
        </ul>
      </div>

      <div class="schema-comparison-card">
        <h4>Snowflake</h4>
        <p class="muted">${data.snowflake_schema.table_names.join(", ")}</p>
        <ul class="schema-plan-list">
          ${data.snowflake_schema.query_plan.map(step => `
            <li><strong>${step.table}</strong> — type: ${step.type}, rows: ${step.rows}</li>
          `).join("")}
        </ul>
      </div>
    </div>

    <p class="muted schema-comparison-footnote">
      Same "count devices by manufacturer" query: the star schema reads 1 table,
      the snowflake variant joins ${data.snowflake_schema.tables_involved} tables to reach the same names.
    </p>
  `;
}

async function syncRiskAlerts() {
  const button = document.getElementById("syncRiskAlertsBtn");

  try {
    button.disabled = true;
    button.textContent = "Syncing...";
    setStatus("alertSyncStatus", "Creating MongoDB alert history records for top high-risk devices...");

    const result = await apiRequest("/api/dashboard/risk-alerts/sync", {
      method: "POST",
      body: JSON.stringify({ limit: 10 })
    });

    setStatus(
      "alertSyncStatus",
      `MongoDB alert sync completed. Created: ${result.created_alerts}, skipped existing: ${result.skipped_existing_alerts}.`
    );
  } catch (error) {
    setStatus("alertSyncStatus", error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Sync MongoDB Alerts";
  }
}

function setupDashboardQuickNav() {
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

setupDashboardQuickNav();

document.getElementById("refreshDashboardBtn").addEventListener("click", loadDashboard);
document.getElementById("syncRiskAlertsBtn").addEventListener("click", syncRiskAlerts);

loadDashboard();
