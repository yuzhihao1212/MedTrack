const AUTH_STORAGE_KEY = "medtrack_auth";
const AUTH_TOKEN_STORAGE_KEY = "medtrack_auth_token";
const AUTH_USER_STORAGE_KEY = "medtrack_auth_user";

function currentPageName() {
  const page = window.location.pathname.split("/").pop();
  return page || "index.html";
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

function requireLogin() {
  const auth = getAuth();
  const page = currentPageName();
  const isLoginPage = page === "login.html";

  if (!auth && !isLoginPage) {
    window.location.replace("login.html");
    return false;
  }

  if (auth && isLoginPage) {
    window.location.replace("dashboard.html");
    return false;
  }

  return true;
}

function renderAuthBar() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const auth = getAuth();
  const nav = topbar.querySelector(".nav-links");

  if (!auth && nav) {
    nav.hidden = true;
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

requireLogin();
document.addEventListener("DOMContentLoaded", renderAuthBar);
