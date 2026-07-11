let failures = [];
let devicesLookup = [];
const canDeleteFailures = getAuth()?.user?.role === "bme_admin";

async function initFailuresPage() {
  document.getElementById("reloadFailuresBtn").addEventListener("click", loadFailures);
  document.getElementById("resetFailureFormBtn").addEventListener("click", resetFailureForm);
  document.getElementById("failureSearch").addEventListener("input", renderFailures);
  document.getElementById("failureForm").addEventListener("submit", saveFailure);

  await loadDeviceLookup();
  await loadFailures();
}

async function loadDeviceLookup() {
  try {
    devicesLookup = await apiRequest("/api/devices");
    document.getElementById("failureDevice").innerHTML = devicesLookup
      .map(item => `<option value="${item.device_id}">${item.device_code} - ${item.type_name}</option>`)
      .join("");
  } catch (error) {
    setStatus("failureStatus", error.message, "error");
  }
}

async function loadFailures() {
  setStatus("failureStatus", "Loading failures...");

  try {
    failures = await apiRequest("/api/failures");
    renderFailures();
    setStatus("failureStatus", `${failures.length} failure records loaded.`);
  } catch (error) {
    setStatus("failureStatus", error.message, "error");
  }
}

function renderFailures() {
  const query = document.getElementById("failureSearch").value;
  const rows = failures.filter(row => matchesSearch(row, query)).slice(0, 100);
  const table = document.getElementById("failuresTable");

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="6">No failure records found.</td></tr>`;
    return;
  }

  table.innerHTML = rows.map(row => {
    const deleteAction = canDeleteFailures
      ? `<button class="btn danger" onclick="deleteFailure(${row.failure_id})">Delete</button>`
      : "";

    return `
      <tr>
        <td><strong>${row.device_code}</strong></td>
        <td>${row.failure_event_count}</td>
        <td>${row.downtime_hours ?? "-"}</td>
        <td>${badge(row.severity)}</td>
        <td>${badge(row.report_status)}</td>
        <td>
          <div class="action-row">
            <button class="btn secondary" onclick="editFailure(${row.failure_id})">Edit</button>
            ${deleteAction}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function editFailure(id) {
  const row = failures.find(item => item.failure_id === id);
  if (!row) return;

  document.getElementById("failureFormTitle").textContent = "Edit Failure Record";
  document.getElementById("failureId").value = row.failure_id;
  document.getElementById("failureDevice").value = row.device_id;
  document.getElementById("failureCount").value = row.failure_event_count ?? 0;
  document.getElementById("downtimeHours").value = row.downtime_hours ?? 0;
  document.getElementById("severity").value = row.severity || "Low";
  document.getElementById("reportStatus").value = row.report_status || "Open";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetFailureForm() {
  document.getElementById("failureFormTitle").textContent = "Add Failure Record";
  document.getElementById("failureForm").reset();
  document.getElementById("failureId").value = "";
}

async function saveFailure(event) {
  event.preventDefault();

  const id = document.getElementById("failureId").value;
  const payload = {
    device_id: Number(document.getElementById("failureDevice").value),
    failure_event_count: Number(document.getElementById("failureCount").value),
    downtime_hours: Number(document.getElementById("downtimeHours").value),
    severity: document.getElementById("severity").value,
    report_status: document.getElementById("reportStatus").value
  };

  try {
    await apiRequest(id ? `/api/failures/${id}` : "/api/failures", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });

    resetFailureForm();
    await loadFailures();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteFailure(id) {
  if (!confirm("Delete this failure record?")) return;

  try {
    await apiRequest(`/api/failures/${id}`, { method: "DELETE" });
    await loadFailures();
  } catch (error) {
    alert(error.message);
  }
}

initFailuresPage();
