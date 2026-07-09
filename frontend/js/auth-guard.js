(function () {
  const page = window.location.pathname.split("/").pop() || "index.html";
  if (page === "login.html") return;

  try {
    const legacyAuth = localStorage.getItem("medtrack_auth");
    const token = localStorage.getItem("medtrack_auth_token");
    const user = localStorage.getItem("medtrack_auth_user");

    if (!legacyAuth && (!token || !user)) {
      window.location.replace("login.html");
    }
  } catch (_error) {
    window.location.replace("login.html");
  }
})();
