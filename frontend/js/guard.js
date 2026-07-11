(function () {
  var pageAccess = {
    "home.html": ["bme_admin", "bme_engineer", "bme_analyst"],
    "dashboard.html": ["bme_admin", "bme_engineer", "bme_analyst"],
    "devices.html": ["bme_admin"],
    "failures.html": ["bme_admin", "bme_engineer"],
    "maintenance.html": ["bme_admin", "bme_engineer"],
    "logs.html": ["bme_admin", "bme_engineer"],
    "analytics.html": ["bme_admin", "bme_analyst"]
  };
  var auth = null;
  var page = window.location.pathname.split("/").pop() || "index.html";

  try {
    var rawAuth = localStorage.getItem("medtrack_auth");
    auth = rawAuth ? JSON.parse(rawAuth) : null;
  } catch (error) {
    auth = null;
  }

  if (!auth) {
    window.location.replace("login.html");
    return;
  }

  if (pageAccess[page] && pageAccess[page].indexOf(auth.user && auth.user.role) === -1) {
    window.location.replace("home.html");
  }
})();
