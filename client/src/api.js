const BASE = '/api';

function apiHeaders(extra = {}) {
  const key = import.meta.env.VITE_API_KEY || '';
  const h = { 'Content-Type': 'application/json', ...extra };
  if (key) h['X-Api-Key'] = key;
  return h;
}

function authHeader() {
  const key = import.meta.env.VITE_API_KEY || '';
  return key ? { 'X-Api-Key': key } : {};
}

async function json(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  dashboard: () => fetch(`${BASE}/dashboard`, { headers: authHeader() }).then(json),

  alunos: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return fetch(`${BASE}/alunos${qs ? `?${qs}` : ''}`, { headers: authHeader() }).then(json);
  },

  filtros: () => fetch(`${BASE}/alunos/filtros`, { headers: authHeader() }).then(json),

  aluno: (id) => fetch(`${BASE}/alunos/${id}`, { headers: authHeader() }).then(json),

  addResponsavel: (alunoId, data) =>
    fetch(`${BASE}/alunos/${alunoId}/responsaveis`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(data),
    }).then(json),

  deleteResponsavel: (id) =>
    fetch(`${BASE}/responsaveis/${id}`, { method: 'DELETE', headers: authHeader() }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(r.statusText);
    }),

  upload: (file) => {
    const form = new FormData();
    form.append('pdf', file);
    return fetch(`${BASE}/upload`, { method: 'POST', headers: authHeader(), body: form }).then(json);
  },

  alertas: (limit) => {
    const qs = limit ? `?limit=${limit}` : '';
    return fetch(`${BASE}/alertas${qs}`, { headers: authHeader() }).then(json);
  },

  whatsappStatus: () => fetch(`${BASE}/alertas/status`, { headers: authHeader() }).then(json),

  enviarAlertas: () =>
    fetch(`${BASE}/alertas/enviar`, { method: 'POST', headers: authHeader() }).then(json),

  previewAlertas: () => fetch(`${BASE}/alertas/preview`, { headers: authHeader() }).then(json),

  disconnectWhatsapp: () =>
    fetch(`${BASE}/alertas/disconnect`, { method: 'POST', headers: authHeader() }).then(json),

  configuracoes: () => fetch(`${BASE}/configuracoes`, { headers: authHeader() }).then(json),

  saveConfiguracoes: (data) =>
    fetch(`${BASE}/configuracoes`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(data),
    }).then(json),

  enviarMensagemManual: (data) =>
    fetch(`${BASE}/mensagens/enviar`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(data),
    }).then(json),

  updateAluno: (id, data) =>
    fetch(`${BASE}/alunos/${id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(data),
    }).then(json),

  deleteAluno: (id) =>
    fetch(`${BASE}/alunos/${id}`, { method: 'DELETE', headers: authHeader() }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(r.statusText);
    }),

  deleteAlunosBulk: (ids) =>
    fetch(`${BASE}/alunos/bulk-delete`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ ids }),
    }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(r.statusText);
    }),

  updateResponsavel: (id, data) =>
    fetch(`${BASE}/responsaveis/${id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(data),
    }).then(json),

  updateFalta: (id, data) =>
    fetch(`${BASE}/faltas/${id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(data),
    }).then(json),

  deleteFalta: (id) =>
    fetch(`${BASE}/faltas/${id}`, { method: 'DELETE', headers: authHeader() }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(r.statusText);
    }),

  deleteAlerta: (id) =>
    fetch(`${BASE}/alertas/${id}`, { method: 'DELETE', headers: authHeader() }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(r.statusText);
    }),
};
