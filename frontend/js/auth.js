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

function pageAllowedForRole(page, role) {
  const analystOnlyPages = ["analytics.html"];
  return !analystOnlyPages.includes(page) || role === "bme_analyst";
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
    bme_analyst: "analytics.html"
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
    window.location.replace("home.html");
    return false;
  }

  if (auth && !pageAllowedForRole(page, auth.user?.role)) {
    window.location.replace("home.html");
    return false;
  }

  return true;
}

function applyRoleNavigation(auth) {
  document.querySelectorAll("[data-role-only]").forEach(link => {
    const allowedRoles = link.dataset.roleOnly.split(",").map(role => role.trim());
    link.hidden = !auth || !allowedRoles.includes(auth.user?.role);
  });
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

  applyRoleNavigation(auth);

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

  if (!topbar.querySelector(".app-mobile-title")) {
    const pageTitle = (document.title.split("|").pop() || "Dashboard").trim();
    const auth = getAuth();
    const title = document.createElement("div");
    title.className = "app-mobile-title";
    title.textContent = pageTitle === "Dashboard" && auth ? `${roleLabel(auth.user.role)} Dashboard` : pageTitle;
    topbar.appendChild(title);
  }

  if (!topbar.querySelector(".app-mobile-role")) {
    const auth = getAuth();
    if (auth) {
      const role = document.createElement("span");
      role.className = "app-mobile-role";
      role.textContent = roleLabel(auth.user.role).toUpperCase();
      topbar.appendChild(role);
    }
  }

  const closeNavigation = () => {
    topbar.classList.remove("nav-open");
    document.body.classList.remove("app-nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  };

  toggle.addEventListener("click", () => {
    const isOpen = topbar.classList.toggle("nav-open");
    document.body.classList.toggle("app-nav-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  });

  nav.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    closeNavigation();
  });

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("app-nav-open")) return;
    if (topbar.contains(event.target)) return;
    closeNavigation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });
}

requireLogin();
document.addEventListener("DOMContentLoaded", () => {
  renderAuthBar();
  initAppNavigation();
});
