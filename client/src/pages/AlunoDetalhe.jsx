import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

function groupByDisciplina(faltas) {
  return faltas.reduce((acc, f) => {
    const key = f.disciplina || 'Sem disciplina';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});
}

function formatDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden p-4 space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-12 bg-slate-100 rounded animate-pulse" />
          <div className="h-12 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden p-4 space-y-3">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-24 bg-slate-100 rounded animate-pulse" />
          <div className="h-24 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ count }) {
  if (count >= 10) {
    return (
      <span className="bg-red-100 text-red-700 font-semibold text-xs px-2 py-0.5 rounded">
        🔴 {count} faltas injustificadas — Alto risco
      </span>
    );
  }
  if (count >= 5) {
    return (
      <span className="bg-orange-100 text-orange-700 font-semibold text-xs px-2 py-0.5 rounded">
        🟠 {count} faltas injustificadas — Em risco
      </span>
    );
  }
  return (
    <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded">
      {count} falta{count !== 1 ? 's' : ''} injustificada{count !== 1 ? 's' : ''}
    </span>
  );
}

function AbsenceCountLabel({ count }) {
  if (count >= 10) {
    return <span className="text-xs font-semibold text-red-600">{count} faltas</span>;
  }
  if (count >= 5) {
    return <span className="text-xs font-semibold text-orange-500">{count} faltas</span>;
  }
  return <span className="text-xs text-slate-500">{count} falta{count !== 1 ? 's' : ''}</span>;
}

export default function AlunoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aluno, setAluno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });
  const { toasts, toast } = useToast();

  const [editingAluno, setEditingAluno] = useState(false);
  const [alunoForm, setAlunoForm] = useState({ nome: '', turma: '', serie: '', curso: '' });
  const [editingRespId, setEditingRespId] = useState(null);
  const [respEditForm, setRespEditForm] = useState({ nome: '', telefone: '' });
  const [editingFaltaId, setEditingFaltaId] = useState(null);
  const [faltaEditForm, setFaltaEditForm] = useState({ data: '', disciplina: '', justificada: false });

  async function load() {
    try {
      setLoading(true);
      const data = await api.aluno(id);
      setAluno(data);
      setAlunoForm({ nome: data.nome, turma: data.turma || '', serie: data.serie || '', curso: data.curso || '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function addResponsavel(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addResponsavel(id, form);
      setForm({ nome: '', telefone: '' });
      toast.success('Responsável adicionado com sucesso');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAluno(e) {
    e.preventDefault();
    try {
      await api.updateAluno(id, alunoForm);
      toast.success('Aluno atualizado');
      setEditingAluno(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDeleteAluno() {
    setConfirmState({
      open: true,
      message: 'Excluir aluno permanentemente? Todos os dados (faltas, responsáveis, alertas) serão removidos.',
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        try {
          await api.deleteAluno(id);
          navigate('/alunos');
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  async function handleSaveResp(respId) {
    try {
      await api.updateResponsavel(respId, respEditForm);
      toast.success('Responsável atualizado');
      setEditingRespId(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDeleteResp(respId) {
    setConfirmState({
      open: true,
      message: 'Remover este responsável?',
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        try {
          await api.deleteResponsavel(respId);
          toast.success('Responsável removido');
          await load();
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  async function handleSaveFalta(faltaId) {
    try {
      await api.updateFalta(faltaId, faltaEditForm);
      toast.success('Falta atualizada');
      setEditingFaltaId(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDeleteFalta(faltaId) {
    setConfirmState({
      open: true,
      message: 'Remover esta falta?',
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        try {
          await api.deleteFalta(faltaId);
          toast.success('Falta removida');
          await load();
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!aluno) return null;

  const grouped = groupByDisciplina(aluno.faltas || []);
  const totalFaltas = (aluno.faltas || []).length;
  const injustificadas = aluno.faltas_injustificadas ?? 0;
  const responsaveis = aluno.responsaveis || [];

  return (
    <div className="p-6 space-y-6">
      <Toast toasts={toasts} />

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm || (() => {})}
        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: null })}
      />

      {/* Page header */}
      <div className="space-y-1">
        <Link to="/alunos" className="text-indigo-600 text-sm hover:underline">← Alunos</Link>

        {!editingAluno ? (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{aluno.nome}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {aluno.turma && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{aluno.turma}</span>}
                {aluno.serie && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{aluno.serie}</span>}
                {aluno.curso && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{aluno.curso}</span>}
                <RiskBadge count={injustificadas} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <button
                onClick={() => setEditingAluno(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Editar
              </button>
              <button
                onClick={handleDeleteAluno}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveAluno} className="space-y-3 max-w-lg">
            <h2 className="text-lg font-bold text-slate-900">Editar aluno</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Nome</label>
                <input
                  required
                  value={alunoForm.nome}
                  onChange={e => setAlunoForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Turma</label>
                <input
                  value={alunoForm.turma}
                  onChange={e => setAlunoForm(f => ({ ...f, turma: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Série</label>
                <input
                  value={alunoForm.serie}
                  onChange={e => setAlunoForm(f => ({ ...f, serie: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Curso</label>
                <input
                  value={alunoForm.curso}
                  onChange={e => setAlunoForm(f => ({ ...f, curso: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Salvar</button>
              <button type="button" onClick={() => setEditingAluno(false)} className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">

        {/* LEFT: Guardians panel */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-slate-800 text-sm">Responsáveis</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              responsaveis.length > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-600'
            }`}>
              {responsaveis.length}
            </span>
          </div>

          {/* Guardian list */}
          {responsaveis.length === 0 ? (
            <p className="text-sm text-slate-500 px-4 py-3">Nenhum responsável cadastrado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {responsaveis.map(r => (
                <li key={r.id} className="px-4 py-3 hover:bg-slate-50">
                  {editingRespId === r.id ? (
                    <div className="space-y-2">
                      <input
                        value={respEditForm.nome}
                        onChange={e => setRespEditForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome"
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <input
                        value={respEditForm.telefone}
                        onChange={e => setRespEditForm(f => ({ ...f, telefone: e.target.value }))}
                        placeholder="Telefone"
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveResp(r.id)}
                          className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg font-medium"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingRespId(null)}
                          className="text-xs text-slate-500 border border-slate-300 px-3 py-1 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{r.nome}</p>
                        <p className="text-xs text-slate-500">{r.telefone}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setEditingRespId(r.id); setRespEditForm({ nome: r.nome, telefone: r.telefone }); }}
                          className="text-indigo-500 hover:text-indigo-700 text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteResp(r.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add form */}
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Adicionar responsável
            </p>
            <form onSubmit={addResponsavel} className="space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome</label>
                <input
                  required
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Telefone WhatsApp</label>
                <input
                  required
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="5545999999999"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Absences by subject */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-slate-800 text-sm">Faltas por disciplina</span>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalFaltas} total · {injustificadas} injustificada{injustificadas !== 1 ? 's' : ''}
            </p>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-slate-500 px-4 py-4">Nenhuma falta registrada.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.entries(grouped).map(([disciplina, faltas]) => (
                <div key={disciplina} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm">{disciplina}</span>
                    <AbsenceCountLabel count={faltas.length} />
                  </div>
                  <div className="space-y-1">
                    {faltas.map(f => (
                      <div key={f.id}>
                        {editingFaltaId === f.id ? (
                          <div className="flex flex-wrap items-center gap-2 py-1">
                            <input
                              type="date"
                              value={faltaEditForm.data?.slice(0, 10) || ''}
                              onChange={e => setFaltaEditForm(x => ({ ...x, data: e.target.value }))}
                              className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                            <input
                              value={faltaEditForm.disciplina}
                              onChange={e => setFaltaEditForm(x => ({ ...x, disciplina: e.target.value }))}
                              placeholder="Disciplina"
                              className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 w-28"
                            />
                            <label className="flex items-center gap-1 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                checked={faltaEditForm.justificada}
                                onChange={e => setFaltaEditForm(x => ({ ...x, justificada: e.target.checked }))}
                                className="accent-indigo-600"
                              />
                              Justificada
                            </label>
                            <button
                              onClick={() => handleSaveFalta(f.id)}
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded font-medium"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingFaltaId(null)}
                              className="text-xs text-slate-500 border border-slate-300 px-2 py-1 rounded"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group py-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${f.justificada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {formatDate(f.data)}
                              </span>
                              {f.justificada && <span className="text-xs text-green-600">Justificada</span>}
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingFaltaId(f.id); setFaltaEditForm({ data: f.data?.slice(0, 10) || '', disciplina: f.disciplina || '', justificada: f.justificada || false }); }}
                                className="text-xs text-indigo-500 hover:text-indigo-700"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteFalta(f.id)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
