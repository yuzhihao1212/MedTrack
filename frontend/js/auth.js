const AUTH_STORAGE_KEY = "medtrack_auth";
const AUTH_TOKEN_STORAGE_KEY = "medtrack_auth_token";
const AUTH_USER_STORAGE_KEY = "medtrack_auth_user";

function currentPageName() {
  const page = window.location.pathname.split("/").pop();
  return page || "index.html";
}

function isPublicPage(page) {
  return page === "index.html" || page === "login.html";
}

function getAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const userRaw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!token || !userRaw) return null;

    return { token, user: JSON.parse(userRaw) };
  } catch (error) {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function logout() {
  clearAuth();
  window.location.href = "login.html";
}

function roleLabel(role) {
  const labels = {
    bme_admin: "Admin",
    bme_manager: "Manager",
    bme_engineer: "Engineer",
    bme_analyst: "Analyst"
  };
  return labels[role] || role;
}

function roleDashboardPath(role) {
  const dashboards = {
    bme_admin: "dashboard.html",
    bme_manager: "dashboard.html#risk-ranking",
    bme_engineer: "dashboard.html#failure-section",
    bme_analyst: "dashboard.html#olap-analytics"
  };

  return dashboards[role] || "dashboard.html";
}

function requireLogin() {
  const auth = getAuth();
  const page = currentPageName();
  const isLoginPage = page === "login.html";

  if (!auth && !isPublicPage(page)) {
    window.location.replace("login.html");
    return false;
  }

  if (auth && isLoginPage) {
    window.location.replace(roleDashboardPath(auth.user?.role));
    return false;
  }

  return true;
}

function renderAuthBar() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const auth = getAuth();
  const nav = topbar.querySelector(".nav-links");
  const page = currentPageName();

  if (!auth && nav && page !== "index.html") {
    nav.hidden = true;
  }

  if (!auth && (page === "login.html" || page === "index.html")) {
    return;
  }

  const bar = document.createElement("div");
  bar.className = "auth-bar";

  if (auth) {
    bar.innerHTML = `
      <span class="auth-user">Privileges ${badge(roleLabel(auth.user.role))}</span>
      <button class="btn secondary" id="authLogoutBtn" type="button">Log out</button>
    `;
    topbar.appendChild(bar);
    document.getElementById("authLogoutBtn").addEventListener("click", logout);
  } else {
    bar.innerHTML = `<a class="btn primary" href="login.html">Log in</a>`;
    topbar.appendChild(bar);
  }
}

function initAppNavigation() {
  const topbar = document.querySelector(".app-shell .topbar");
  const toggle = topbar?.querySelector(".app-nav-toggle");
  const nav = topbar?.querySelector(".nav-links");

  if (!topbar || !toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = topbar.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  });

  nav.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;

    topbar.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  });
}

requireLogin();
document.addEventListener("DOMContentLoaded", () => {
  renderAuthBar();
  initAppNavigation();
});
