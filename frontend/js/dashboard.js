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
    const [summary, maintenanceCost, btreeIndexes] = await Promise.all([
      apiRequest("/api/olap/summary"),
      apiRequest("/api/olap/maintenance-cost?limit=8"),
      apiRequest("/api/olap/btree-indexes")
    ]);

    document.getElementById("warehouseDevices").textContent = summary.warehouse_devices ?? 0;
    document.getElementById("failureFactRows").textContent = summary.failure_fact_rows ?? 0;
    document.getElementById("maintenanceFactRows").textContent = summary.maintenance_fact_rows ?? 0;
    document.getElementById("warehouseMaintenanceCost").textContent = formatMoney(summary.total_maintenance_cost);

    renderOlapCostTable(maintenanceCost || []);
    renderBtreeIndexTable(btreeIndexes?.tables || {});

    setStatus(
      "olapDashboardStatus",
      "OLAP warehouse loaded. B+ tree index metadata is available for OLTP and warehouse tables."
    );
  } catch (error) {
    renderOlapCostTable([]);
    renderBtreeIndexTable({});
    setStatus("olapDashboardStatus", error.message, "error");
  }
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

document.getElementById("refreshDashboardBtn").addEventListener("click", loadDashboard);
document.getElementById("syncRiskAlertsBtn").addEventListener("click", syncRiskAlerts);

loadDashboard();
