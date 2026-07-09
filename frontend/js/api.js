const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
const AUTH_TOKEN_KEY = "medtrack_auth_token";
const AUTH_USER_KEY = "medtrack_auth_user";

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
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
    localStorage.removeItem("medtrack_auth");
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || payload.details || "API request failed");
  }

  return payload.data ?? payload;
}

async function login(username, password) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ username, password })
  });

  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  renderAuthWidget();
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  renderAuthWidget();
}

function renderAuthWidget() {
  let widget = document.getElementById("authWidget");
  if (!widget) {
    widget = document.createElement("div");
    widget.id = "authWidget";
    widget.className = "auth-widget";
    document.body.appendChild(widget);
  }

  const user = getAuthUser();
  if (user) {
    widget.innerHTML = `
      <span><strong>${user.username}</strong> (${user.role})</span>
      <button class="btn secondary compact" type="button" id="logoutBtn">Logout</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", logout);
    return;
  }

  widget.innerHTML = `
    <form id="loginForm" class="auth-form">
      <input id="loginUsername" type="text" placeholder="bme_admin01" autocomplete="username" />
      <input id="loginPassword" type="password" placeholder="BmeAdmin@123" autocomplete="current-password" />
      <button class="btn primary compact" type="submit">Login</button>
      <span id="loginStatus"></span>
    </form>
  `;

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("loginStatus");
    status.textContent = "";

    try {
      await login(
        document.getElementById("loginUsername").value,
        document.getElementById("loginPassword").value
      );
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

document.addEventListener("DOMContentLoaded", renderAuthWidget);

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
