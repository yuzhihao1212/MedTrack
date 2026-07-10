document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  setStatus("loginStatus", "Logging in...");

  try {
    const { token, user } = await apiRequest("/api/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ username, password })
    });

    setAuth(token, user);
    window.location.href = roleDashboardPath(user.role);
  } catch (error) {
    setStatus("loginStatus", error.message, "error");
  }
});
