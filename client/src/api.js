const BASE = '/api';

async function json(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  dashboard: () => fetch(`${BASE}/dashboard`).then(json),

  alunos: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return fetch(`${BASE}/alunos${qs ? `?${qs}` : ''}`).then(json);
  },

  filtros: () => fetch(`${BASE}/alunos/filtros`).then(json),

  aluno: (id) => fetch(`${BASE}/alunos/${id}`).then(json),

  addResponsavel: (alunoId, data) =>
    fetch(`${BASE}/alunos/${alunoId}/responsaveis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json),

  deleteResponsavel: (id) =>
    fetch(`${BASE}/responsaveis/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(r.statusText);
    }),

  upload: (file) => {
    const form = new FormData();
    form.append('pdf', file);
    return fetch(`${BASE}/upload`, { method: 'POST', body: form }).then(json);
  },

  alertas: (limit) => {
    const qs = limit ? `?limit=${limit}` : '';
    return fetch(`${BASE}/alertas${qs}`).then(json);
  },

  whatsappStatus: () => fetch(`${BASE}/alertas/status`).then(json),

  enviarAlertas: () =>
    fetch(`${BASE}/alertas/enviar`, { method: 'POST' }).then(json),
};
