let maintenanceRecords = [];
let maintenanceDevices = [];
let technicians = [];

async function initMaintenancePage() {
  document.getElementById("reloadMaintenanceBtn").addEventListener("click", loadMaintenanceRecords);
  document.getElementById("resetMaintenanceFormBtn").addEventListener("click", resetMaintenanceForm);
  document.getElementById("maintenanceSearch").addEventListener("input", renderMaintenanceRecords);
  document.getElementById("maintenanceForm").addEventListener("submit", saveMaintenanceRecord);

  await loadMaintenanceLookups();
  await loadMaintenanceRecords();
}

async function loadMaintenanceLookups() {
  try {
    [maintenanceDevices, technicians] = await Promise.all([
      apiRequest("/api/devices"),
      apiRequest("/api/maintenance/technicians")
    ]);

    document.getElementById("maintenanceDevice").innerHTML = maintenanceDevices
      .map(item => `<option value="${item.device_id}">${item.device_code} - ${item.type_name}</option>`)
      .join("");

    document.getElementById("technician").innerHTML = `<option value="">No technician assigned</option>` + technicians
      .map(item => `<option value="${item.technician_id}">${item.full_name}</option>`)
      .join("");
  } catch (error) {
    setStatus("maintenanceStatus", error.message, "error");
  }
}

async function loadMaintenanceRecords() {
  setStatus("maintenanceStatus", "Loading maintenance records...");

  try {
    maintenanceRecords = await apiRequest("/api/maintenance");
    renderMaintenanceRecords();
    setStatus("maintenanceStatus", `${maintenanceRecords.length} maintenance records loaded.`);
  } catch (error) {
    setStatus("maintenanceStatus", error.message, "error");
  }
}

function renderMaintenanceRecords() {
  const query = document.getElementById("maintenanceSearch").value;
  const rows = maintenanceRecords.filter(row => matchesSearch(row, query)).slice(0, 100);
  const table = document.getElementById("maintenanceTable");

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="7">No maintenance records found.</td></tr>`;
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td><strong>${row.device_code}</strong></td>
      <td>${row.technician_name || "-"}</td>
      <td>${row.maintenance_frequency ?? "-"}</td>
      <td>${badge(row.maintenance_priority)}</td>
      <td>${formatMoney(row.maintenance_cost)}</td>
      <td>${badge(row.repair_status)}</td>
      <td>
        <div class="action-row">
          <button class="btn secondary" onclick="editMaintenanceRecord(${row.maintenance_id})">Edit</button>
          <button class="btn danger" onclick="deleteMaintenanceRecord(${row.maintenance_id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function editMaintenanceRecord(id) {
  const row = maintenanceRecords.find(item => item.maintenance_id === id);
  if (!row) return;

  document.getElementById("maintenanceFormTitle").textContent = "Edit Maintenance Record";
  document.getElementById("maintenanceId").value = row.maintenance_id;
  document.getElementById("maintenanceDevice").value = row.device_id;
  document.getElementById("technician").value = row.technician_id || "";
  document.getElementById("maintenanceFrequency").value = row.maintenance_frequency ?? "";
  document.getElementById("maintenanceClass").value = row.maintenance_class ?? "";
  document.getElementById("maintenancePriority").value = row.maintenance_priority || "Medium";
  document.getElementById("maintenanceCost").value = row.maintenance_cost ?? "";
  document.getElementById("repairStatus").value = row.repair_status || "Pending";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetMaintenanceForm() {
  document.getElementById("maintenanceFormTitle").textContent = "Add Maintenance Record";
  document.getElementById("maintenanceForm").reset();
  document.getElementById("maintenanceId").value = "";
}

async function saveMaintenanceRecord(event) {
  event.preventDefault();

  const id = document.getElementById("maintenanceId").value;
  const payload = {
    device_id: Number(document.getElementById("maintenanceDevice").value),
    technician_id: document.getElementById("technician").value ? Number(document.getElementById("technician").value) : null,
    maintenance_frequency: document.getElementById("maintenanceFrequency").value ? Number(document.getElementById("maintenanceFrequency").value) : null,
    maintenance_class: document.getElementById("maintenanceClass").value ? Number(document.getElementById("maintenanceClass").value) : null,
    maintenance_priority: document.getElementById("maintenancePriority").value,
    maintenance_cost: document.getElementById("maintenanceCost").value ? Number(document.getElementById("maintenanceCost").value) : null,
    repair_status: document.getElementById("repairStatus").value
  };

  try {
    await apiRequest(id ? `/api/maintenance/${id}` : "/api/maintenance", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });

    resetMaintenanceForm();
    await loadMaintenanceRecords();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteMaintenanceRecord(id) {
  if (!confirm("Delete this maintenance record?")) return;

  try {
    await apiRequest(`/api/maintenance/${id}`, { method: "DELETE" });
    await loadMaintenanceRecords();
  } catch (error) {
    alert(error.message);
  }
}

initMaintenancePage();