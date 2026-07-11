const HOME_WELCOME_FLAG = "medtrack_show_welcome";

function showLoginWelcome() {
  const shouldShowWelcome = sessionStorage.getItem(HOME_WELCOME_FLAG) === "1";
  if (!shouldShowWelcome) return;

  sessionStorage.removeItem(HOME_WELCOME_FLAG);

  const auth = typeof getAuth === "function" ? getAuth() : null;
  const username = auth?.user?.username || "there";
  const banner = document.getElementById("loginWelcomeBanner");
  const name = document.getElementById("loginWelcomeName");

  if (!banner || !name) return;

  name.textContent = username;
  banner.hidden = false;
  requestAnimationFrame(() => banner.classList.add("is-visible"));
}

document.addEventListener("DOMContentLoaded", showLoginWelcome);
