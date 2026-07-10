(function () {
  var isAuthed = false;
  try {
    isAuthed = !!localStorage.getItem("medtrack_auth");
  } catch (error) {
    isAuthed = false;
  }

  if (!isAuthed) {
    window.location.replace("login.html");
  }
})();
