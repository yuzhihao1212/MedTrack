let devices = [];
let deviceTypes = [];
let manufacturers = [];

async function initDevicesPage() {
  document.getElementById("reloadDevicesBtn").addEventListener("click", loadDevices);
  document.getElementById("resetDeviceFormBtn").addEventListener("click", resetDeviceForm);
  document.getElementById("deviceSearch").addEventListener("input", renderDevices);
  document.getElementById("deviceForm").addEventListener("submit", saveDevice);

  await loadLookups();
  await loadDevices();
}

async function loadLookups() {
  try {
    [deviceTypes, manufacturers] = await Promise.all([
      apiRequest("/api/devices/device-types"),
      apiRequest("/api/devices/manufacturers")
    ]);

    document.getElementById("deviceType").innerHTML = deviceTypes
      .map(type => `<option value="${type.device_type_id}">${type.type_name}</option>`)
      .join("");

    document.getElementById("manufacturer").innerHTML = manufacturers
      .map(item => `<option value="${item.manufacturer_id}">${item.manufacturer_name}</option>`)
      .join("");
  } catch (error) {
    setStatus("deviceStatus", error.message, "error");
  }
}

async function loadDevices() {
  setStatus("deviceStatus", "Loading devices...");

  try {
    devices = await apiRequest("/api/devices");
    renderDevices();
    setStatus("deviceStatus", `${devices.length} device records loaded.`);
  } catch (error) {
    setStatus("deviceStatus", error.message, "error");
  }
}

function renderDevices() {
  const query = document.getElementById("deviceSearch").value;
  const rows = devices.filter(row => matchesSearch(row, query)).slice(0, 100);
  const table = document.getElementById("devicesTable");

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="7">No devices found.</td></tr>`;
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td><strong>${row.device_code}</strong></td>
      <td>${row.type_name}</td>
      <td>${row.manufacturer_name}</td>
      <td>${row.model || "-"}</td>
      <td>${row.age_years ?? "-"}</td>
      <td>${badge(row.risk_status)}</td>
      <td>
        <div class="action-row">
          <button class="btn secondary" onclick="editDevice(${row.device_id})">Edit</button>
          <button class="btn danger" onclick="deleteDevice(${row.device_id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function editDevice(id) {
  const row = devices.find(item => item.device_id === id);
  if (!row) return;

  document.getElementById("deviceFormTitle").textContent = "Edit Device";
  document.getElementById("deviceId").value = row.device_id;
  document.getElementById("deviceCode").value = row.device_code || "";
  document.getElementById("deviceType").value = row.device_type_id;
  document.getElementById("manufacturer").value = row.manufacturer_id;
  document.getElementById("model").value = row.model || "";
  document.getElementById("purchaseDate").value = formatDate(row.purchase_date);
  document.getElementById("ageYears").value = row.age_years ?? "";
  document.getElementById("riskStatus").value = row.risk_status || "Low";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetDeviceForm() {
  document.getElementById("deviceFormTitle").textContent = "Add Device";
  document.getElementById("deviceForm").reset();
  document.getElementById("deviceId").value = "";
}

async function saveDevice(event) {
  event.preventDefault();

  const id = document.getElementById("deviceId").value;
  const payload = {
    device_code: document.getElementById("deviceCode").value.trim(),
    device_type_id: Number(document.getElementById("deviceType").value),
    manufacturer_id: Number(document.getElementById("manufacturer").value),
    model: document.getElementById("model").value.trim() || null,
    purchase_date: document.getElementById("purchaseDate").value || null,
    age_years: document.getElementById("ageYears").value ? Number(document.getElementById("ageYears").value) : null,
    risk_status: document.getElementById("riskStatus").value
  };

  try {
    await apiRequest(id ? `/api/devices/${id}` : "/api/devices", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });

    resetDeviceForm();
    await loadDevices();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteDevice(id) {
  if (!confirm("Delete this device and its related records?")) return;

  try {
    await apiRequest(`/api/devices/${id}`, { method: "DELETE" });
    await loadDevices();
  } catch (error) {
    alert(error.message);
  }
}

initDevicesPage();