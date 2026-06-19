let notes = [];
let eventLogs = [];

async function initLogsPage() {
  document.getElementById("reloadLogsBtn").addEventListener("click", loadLogs);
  document.getElementById("noteForm").addEventListener("submit", saveNote);
  document.getElementById("eventForm").addEventListener("submit", saveEventLog);
  await loadLogs();
}

async function loadLogs() {
  await Promise.all([loadNotes(), loadEventLogs()]);
}

async function loadNotes() {
  setStatus("notesStatus", "Loading technician notes...");

  try {
    notes = await apiRequest("/api/logs/notes");
    renderNotes();
    setStatus("notesStatus", `${notes.length} technician notes loaded.`);
  } catch (error) {
    setStatus("notesStatus", error.message, "error");
  }
}

function renderNotes() {
  const container = document.getElementById("notesList");

  if (!notes.length) {
    container.innerHTML = `<p class="muted">No technician notes found.</p>`;
    return;
  }

  container.innerHTML = notes.slice(0, 12).map(note => `
    <article class="document-card">
      <strong>${note.device_code || "Unknown device"}</strong>
      <span class="muted">${note.technician_name || "Unknown technician"}</span>
      <p>${note.note || "No note content."}</p>
    </article>
  `).join("");
}

async function loadEventLogs() {
  setStatus("eventsStatus", "Loading event logs...");

  try {
    eventLogs = await apiRequest("/api/logs");
    renderEventLogs();
    setStatus("eventsStatus", `${eventLogs.length} event logs loaded.`);
  } catch (error) {
    setStatus("eventsStatus", error.message, "error");
  }
}

function renderEventLogs() {
  const container = document.getElementById("eventsList");

  if (!eventLogs.length) {
    container.innerHTML = `<p class="muted">No event logs found.</p>`;
    return;
  }

  container.innerHTML = eventLogs.slice(0, 12).map(log => `
    <article class="document-card">
      <strong>${log.device_code || "Unknown device"} ${badge(log.severity)}</strong>
      <span class="muted">${log.event_type || "Event"}</span>
      <p>${log.event_message || "No event message."}</p>
    </article>
  `).join("");
}

async function saveNote(event) {
  event.preventDefault();

  const payload = {
    device_code: document.getElementById("noteDeviceCode").value.trim(),
    technician_name: document.getElementById("technicianName").value.trim(),
    note: document.getElementById("noteText").value.trim()
  };

  try {
    await apiRequest("/api/logs/notes", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    document.getElementById("noteForm").reset();
    await loadNotes();
  } catch (error) {
    alert(error.message);
  }
}

async function saveEventLog(event) {
  event.preventDefault();

  const payload = {
    device_code: document.getElementById("eventDeviceCode").value.trim(),
    event_type: document.getElementById("eventType").value.trim(),
    severity: document.getElementById("eventSeverity").value,
    event_message: document.getElementById("eventMessage").value.trim()
  };

  try {
    await apiRequest("/api/logs", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    document.getElementById("eventForm").reset();
    await loadEventLogs();
  } catch (error) {
    alert(error.message);
  }
}

initLogsPage();