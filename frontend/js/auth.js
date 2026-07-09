const AUTH_STORAGE_KEY = "medtrack_auth";

function getAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function logout() {
  clearAuth();
  window.location.href = "login.html";
}

function renderAuthBar() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const auth = getAuth();
  const bar = document.createElement("div");
  bar.className = "auth-bar";

  if (auth) {
    bar.innerHTML = `
      <span class="auth-user">${auth.user.username} ${badge(auth.user.role)}</span>
      <button class="btn secondary" id="authLogoutBtn" type="button">Log out</button>
    `;
    topbar.appendChild(bar);
    document.getElementById("authLogoutBtn").addEventListener("click", logout);
  } else {
    bar.innerHTML = `<a class="btn primary" href="login.html">Log in</a>`;
    topbar.appendChild(bar);
  }
}

document.addEventListener("DOMContentLoaded", renderAuthBar);
