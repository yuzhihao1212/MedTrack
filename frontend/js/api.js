const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
const AUTH_TOKEN_KEY = "medtrack_auth_token";
const AUTH_USER_KEY = "medtrack_auth_user";
const LEGACY_AUTH_KEY = "medtrack_auth";

function getAuthToken() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) return token;

  try {
    const auth = JSON.parse(localStorage.getItem(LEGACY_AUTH_KEY) || "null");
    return auth?.token || null;
  } catch (_err) {
    return null;
  }
}

function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  try {
    if (raw) return JSON.parse(raw);

    const auth = JSON.parse(localStorage.getItem(LEGACY_AUTH_KEY) || "null");
    return auth?.user || null;
  } catch (_err) {
    return null;
  }
}

function setStoredAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(LEGACY_AUTH_KEY, JSON.stringify({ token, user }));
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(LEGACY_AUTH_KEY);
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const authHeader = token && !options.skipAuth
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { success: response.ok, message: await response.text() };

  if (response.status === 401 && token) {
    clearStoredAuth();
    if (!window.location.pathname.endsWith("login.html")) {
      window.location.replace("login.html");
    }
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
