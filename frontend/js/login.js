const LOGIN_TRANSITION_MS = 1900;
const LOGIN_FADE_OUT_MS = 520;
const LOGIN_HOME_PATH = "home.html";
const LOGIN_WELCOME_FLAG = "medtrack_show_welcome";

function playLoginTransition(destination) {
  const transition = document.getElementById("loginTransition");

  if (!transition) {
    window.location.href = destination;
    return;
  }

  transition.removeAttribute("aria-hidden");
  requestAnimationFrame(() => transition.classList.add("is-active"));

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const displayMs = prefersReducedMotion ? 350 : LOGIN_TRANSITION_MS;
  const fadeMs = prefersReducedMotion ? 0 : LOGIN_FADE_OUT_MS;

  window.setTimeout(() => {
    transition.classList.add("is-leaving");

    window.setTimeout(() => {
      window.location.href = destination;
    }, fadeMs);
  }, displayMs);
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (submitButton) submitButton.disabled = true;
  setStatus("loginStatus", "Logging in...");

  try {
    const { token, user } = await apiRequest("/api/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ username, password })
    });

    setAuth(token, user);
    sessionStorage.setItem(LOGIN_WELCOME_FLAG, "1");
    setStatus("loginStatus", "Login successful. Preparing your workspace...");
    playLoginTransition(LOGIN_HOME_PATH);
  } catch (error) {
    if (submitButton) submitButton.disabled = false;
    setStatus("loginStatus", error.message, "error");
  }
});
