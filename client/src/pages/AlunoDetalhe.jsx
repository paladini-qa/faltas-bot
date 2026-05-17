import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
  const [aluno, setAluno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, respId: null });
  const { toasts, toast } = useToast();

  async function load() {
    try {
      setLoading(true);
      setAluno(await api.aluno(id));
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

  if (loading) return <LoadingSkeleton />;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!aluno) return null;

  const grouped = groupByDisciplina(aluno.faltas || []);
  const totalFaltas = (aluno.faltas || []).length;
  const injustificadas = aluno.faltas_injustificadas ?? 0;
  const responsaveis = aluno.responsaveis || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Toast toasts={toasts} />

      <ConfirmModal
        open={confirmState.open}
        message="Remover este responsável?"
        onConfirm={async () => {
          const respId = confirmState.respId;
          setConfirmState({ open: false, respId: null });
          try {
            await api.deleteResponsavel(respId);
            toast.success('Responsável removido');
            await load();
          } catch (e) {
            toast.error(e.message);
          }
        }}
        onCancel={() => setConfirmState({ open: false, respId: null })}
      />

      {/* Page header */}
      <div className="space-y-1">
        <Link to="/alunos" className="text-indigo-600 text-sm hover:underline">← Alunos</Link>
        <h1 className="text-2xl font-bold text-slate-900">{aluno.nome}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {aluno.turma && (
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">
              {aluno.turma}
            </span>
          )}
          {aluno.serie && (
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">
              {aluno.serie}
            </span>
          )}
          {aluno.curso && (
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">
              {aluno.curso}
            </span>
          )}
          <RiskBadge count={injustificadas} />
        </div>
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
                <li key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{r.nome}</p>
                    <p className="text-xs text-slate-500">{r.telefone}</p>
                  </div>
                  <button
                    onClick={() => setConfirmState({ open: true, respId: r.id })}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Remover
                  </button>
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
                  <div className="flex flex-wrap gap-1.5">
                    {faltas.map(f => (
                      <span
                        key={f.id}
                        title={f.justificada ? 'Justificada' : 'Injustificada'}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          f.justificada
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {formatDate(f.data)}
                        {f.justificada && ' ✓'}
                      </span>
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
