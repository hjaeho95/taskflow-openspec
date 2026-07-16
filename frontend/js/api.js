const API_BASE = window.TASKFLOW_API_BASE ?? "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
}

function setUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

/**
 * Core fetch wrapper: attaches JWT, parses `{ error: {code,message} }` bodies,
 * and redirects to /login.html on 401 (TOKEN_EXPIRED / missing token) per
 * design.md decision #2 (no refresh token — always re-login).
 */
async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw { code: "NETWORK_ERROR", message: "네트워크 연결을 확인해주세요" };
  }

  if (res.status === 401) {
    clearToken();
    localStorage.removeItem("user");
    if (!location.pathname.endsWith("/login.html")) {
      location.href = "login.html";
    }
    throw { code: "TOKEN_EXPIRED", message: "인증이 만료되었습니다" };
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    const err = body.error || { code: "UNKNOWN_ERROR", message: "요청을 처리할 수 없습니다" };
    throw err;
  }

  return body;
}

const api = {
  signup: (email, password) =>
    apiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),
  me: () => apiFetch("/auth/me"),

  createTeam: (name) =>
    apiFetch("/teams", { method: "POST", body: JSON.stringify({ name }) }),
  joinTeam: (invite_code) =>
    apiFetch("/teams/join", { method: "POST", body: JSON.stringify({ invite_code }) }),
  getTeam: (teamId) => apiFetch(`/teams/${teamId}`),
  getMembers: (teamId) => apiFetch(`/teams/${teamId}/members`),
  leaveTeam: (teamId) => apiFetch(`/teams/${teamId}/leave`, { method: "DELETE" }),

  listTasks: (teamId, filter) =>
    apiFetch(`/teams/${teamId}/tasks${filter ? `?filter=${filter}` : ""}`),
  createTask: (teamId, title, assignee_id) =>
    apiFetch(`/teams/${teamId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ title, assignee_id: assignee_id ?? null }),
    }),
  getTask: (taskId) => apiFetch(`/tasks/${taskId}`),
  updateTask: (taskId, patch) =>
    apiFetch(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(patch) }),
  updateTaskStatus: (taskId, status) =>
    apiFetch(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteTask: (taskId) => apiFetch(`/tasks/${taskId}`, { method: "DELETE" }),

  listMessages: (teamId, since) =>
    apiFetch(`/teams/${teamId}/messages${since ? `?since=${encodeURIComponent(since)}` : ""}`),
  sendMessage: (teamId, content) =>
    apiFetch(`/teams/${teamId}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
  deleteMessage: (messageId) => apiFetch(`/messages/${messageId}`, { method: "DELETE" }),
};
