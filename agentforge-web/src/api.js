const API_BASE = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = 'af_token';
const USER_KEY = 'af_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('af-unauthorized'));
  }

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export const api = {
  base: API_BASE,

  // Auth
  register: (body) => request('/api/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/api/auth/login', { method: 'POST', body, auth: false }),

  // Conversations
  myChats: () => request('/api/chat/mine'),
  createChat: (title) => request('/api/chat/create', { method: 'POST', body: { title } }),
  renameChat: (id, title) =>
    request(`/api/chat/${id}/rename`, { method: 'PUT', body: { title } }),
  chatDetails: (id) => request(`/api/chat/${id}/details`),
  sendMessage: (body) => request('/api/chat/message', { method: 'POST', body }),
  deleteChat: (id) => request(`/api/chat/${id}`, { method: 'DELETE' }),
  deleteMessage: (id) => request(`/api/chat/message/${id}`, { method: 'DELETE' }),
  setupTeam: (conversationId, teamId) =>
    request('/api/chat/setup', { method: 'POST', body: { conversationId, teamId } }),
  trace: (sessionId) => request(`/api/chat/trace/${sessionId}`),

  // Teams & agents
  teams: () => request('/api/agents/teams'),
  createTeam: (name) =>
    request('/api/agents/teams', { method: 'POST', body: { name, conversationId: EMPTY_GUID } }),
  updateTeam: (team) => request(`/api/agents/teams/${team.agentTeamId}`, { method: 'PUT', body: team }),
  createAgent: (agent) => request('/api/agents/create', { method: 'POST', body: agent }),
  updateAgent: (agent) => request('/api/agents/update', { method: 'PUT', body: agent }),
  deleteAgent: (id) => request(`/api/agents/${id}`, { method: 'DELETE' }),
};

export { API_BASE };
