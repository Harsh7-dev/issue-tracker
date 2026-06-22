// Thin fetch wrapper. Attaches the JWT and normalizes error handling so the UI
// always receives a consistent { error } shape on failure.
const BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // A rejected or expired token on an authenticated call comes back as 401/403.
  // Clear the stale session and send the user back to login rather than leaving
  // them stuck on a logged-in-looking page where every request silently fails.
  // (Auth endpoints are exempt: a 401 there just means bad credentials.)
  if ((res.status === 401 || res.status === 403) && !path.startsWith('/auth')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new Error('Your session has expired. Please log in again.');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  getStats: () => request('/dashboard/stats'),

  listProjects: () => request('/projects'),
  createProject: (payload) => request('/projects', { method: 'POST', body: payload }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, payload) => request(`/projects/${id}`, { method: 'PATCH', body: payload }),
  archiveProject: (id) => request(`/projects/${id}/archive`, { method: 'POST' }),

  listIssues: (projectId, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return request(`/projects/${projectId}/issues${qs ? `?${qs}` : ''}`);
  },
  createIssue: (projectId, payload) =>
    request(`/projects/${projectId}/issues`, { method: 'POST', body: payload }),
  updateIssue: (id, payload) => request(`/issues/${id}`, { method: 'PATCH', body: payload }),
  deleteIssue: (id) => request(`/issues/${id}`, { method: 'DELETE' }),
};
