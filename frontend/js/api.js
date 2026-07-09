const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

async function apiRequest(path, options = {}) {
  let token = null;
  try {
    const stored = localStorage.getItem("medtrack_auth");
    token = stored ? JSON.parse(stored).token : null;
  } catch (error) {
    localStorage.removeItem("medtrack_auth");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { success: response.ok, message: await response.text() };

  if (response.status === 401 && token) {
    localStorage.removeItem("medtrack_auth");
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || payload.details || "API request failed");
  }

  return payload.data ?? payload;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toLocaleString("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function badge(value) {
  const safe = String(value || "-");
  return `<span class="badge ${safe.replaceAll(" ", "-")}">${safe}</span>`;
}

function setStatus(id, message, type = "normal") {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.style.color = type === "error" ? "#b42318" : "#667085";
}

function matchesSearch(row, query) {
  if (!query) return true;
  return JSON.stringify(row).toLowerCase().includes(query.toLowerCase());
}