/**
 * Route guards shared by every page. Call the relevant guard at the top of
 * each page's script before rendering anything.
 */

function requireAuth() {
  if (!getToken()) {
    location.href = "login.html";
    return null;
  }
  return getUser();
}

/** For pages that require the user to already belong to a team (kanban, chat). */
async function requireTeam() {
  const user = requireAuth();
  if (!user) return null;

  // Always re-check with the server: team membership can change (e.g. owner
  // deleted the team) between page loads.
  let fresh;
  try {
    fresh = await api.me();
  } catch {
    return null; // apiFetch already redirected on 401
  }
  setUser(fresh);

  if (fresh.team_id === null) {
    location.href = "team-select.html";
    return null;
  }
  return fresh;
}

/** For the team-select page: bounce straight to kanban if already on a team. */
async function redirectIfAlreadyOnTeam() {
  const user = requireAuth();
  if (!user) return;

  let fresh;
  try {
    fresh = await api.me();
  } catch {
    return;
  }
  setUser(fresh);

  if (fresh.team_id !== null) {
    location.href = `kanban.html?team=${fresh.team_id}`;
  }
}

async function doLogout() {
  try {
    await api.logout();
  } catch {
    // stateless logout: ignore network errors, still clear local state
  }
  clearToken();
  localStorage.removeItem("user");
  location.href = "login.html";
}
