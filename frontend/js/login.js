const LOGIN_TRANSITION_MS = 1900;

function playLoginTransition(destination) {
  const transition = document.getElementById("loginTransition");

  if (!transition) {
    window.location.href = destination;
    return;
  }

  transition.removeAttribute("aria-hidden");
  requestAnimationFrame(() => transition.classList.add("is-active"));

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.setTimeout(() => {
    window.location.href = destination;
  }, prefersReducedMotion ? 350 : LOGIN_TRANSITION_MS);
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
    setStatus("loginStatus", "Login successful. Preparing your workspace...");
    playLoginTransition(roleDashboardPath(user.role));
  } catch (error) {
    if (submitButton) submitButton.disabled = false;
    setStatus("loginStatus", error.message, "error");
  }
});
