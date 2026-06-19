async function loadDashboard() {
  setStatus("dashboardStatus", "Loading dashboard data...");

  try {
    const [summary, failureSummary, highRiskDevices] = await Promise.all([
      apiRequest("/api/dashboard"),
      apiRequest("/api/failures/summary"),
      apiRequest("/api/devices/high-risk")
    ]);

    document.getElementById("totalDevices").textContent = summary.total_devices ?? 0;
    document.getElementById("unresolvedFailures").textContent = summary.unresolved_failures ?? 0;
    document.getElementById("highRiskDevices").textContent = summary.high_risk_devices ?? 0;
    document.getElementById("completedMaintenance").textContent = summary.completed_maintenance ?? 0;
    document.getElementById("avgMaintenanceCost").textContent = formatMoney(summary.avg_maintenance_cost);

    renderFailureBars(failureSummary || []);
    renderHighRiskTable((highRiskDevices || []).slice(0, 8));
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

document.getElementById("refreshDashboardBtn").addEventListener("click", loadDashboard);
loadDashboard();