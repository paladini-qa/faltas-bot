import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import SkeletonRow from '../components/SkeletonRow';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

function riskLabel(faltas) {
  if (faltas >= 10) return 'Alto risco';
  if (faltas >= 5) return 'Em risco';
  return 'Regular';
}

function riskBadgeStyle(faltas) {
  if (faltas >= 10) return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700';
  if (faltas >= 5) return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700';
  return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700';
}

function rowBorderStyle(faltas) {
  if (faltas >= 10) return 'border-l-4 border-l-red-500 bg-red-50/40';
  if (faltas >= 5) return 'border-l-4 border-l-orange-500 bg-orange-50/30';
  return 'border-l-4 border-l-transparent';
}

function faltasCellStyle(faltas) {
  if (faltas >= 10) return 'px-4 py-3 font-bold text-red-600';
  if (faltas >= 5) return 'px-4 py-3 font-bold text-orange-500';
  return 'px-4 py-3 font-bold text-slate-700';
}

const CHIP_BASE = 'px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all';
const CHIP_ACTIVE = 'bg-red-100 text-red-700 ring-2 ring-red-400';
const CHIP_INACTIVE = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

export default function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [confirmState, setConfirmState] = useState({ open: false, alunoId: null, alunoNome: '' });
  const [confirmBulk, setConfirmBulk] = useState(false);
  const { toasts, toast } = useToast();
  const [selected, setSelected] = useState(new Set());

  const q = params.get('q') || '';
  const turma = params.get('turma') || '';
  const serie = params.get('serie') || '';
  const curso = params.get('curso') || '';
  const risco = params.get('risco') || '';

  useEffect(() => {
    api.filtros().then(setFiltros).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.alunos({ q, turma, serie, curso, risco })
      .then(data => { setAlunos(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [q, turma, serie, curso, risco]);

  useEffect(() => {
    setSelected(new Set());
  }, [q, turma, serie, curso, risco]);

  function set(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  }

  function toggleRisco(value) {
    set('risco', risco === value ? '' : value);
  }

  const emRiscoCount = alunos.filter(a => a.faltas_injustificadas >= 5).length;

  function handleDelete(e, alunoId, alunoNome) {
    e.stopPropagation();
    setConfirmState({ open: true, alunoId, alunoNome });
  }

  async function confirmDelete() {
    await api.deleteAluno(confirmState.alunoId);
    setAlunos(prev => prev.filter(a => a.id !== confirmState.alunoId));
    toast.success('Aluno excluído');
    setConfirmState({ open: false, alunoId: null, alunoNome: '' });
  }

  async function confirmBulkDelete() {
    const ids = [...selected];
    await api.deleteAlunosBulk(ids);
    setAlunos(prev => prev.filter(a => !selected.has(a.id)));
    const count = ids.length;
    toast.success(`${count} aluno${count !== 1 ? 's' : ''} excluído${count !== 1 ? 's' : ''}`);
    setSelected(new Set());
    setConfirmBulk(false);
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === alunos.length && alunos.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(alunos.map(a => a.id)));
    }
  }

  return (
    <>
    <ConfirmModal
      open={confirmState.open}
      message={`Excluir "${confirmState.alunoNome}"? Todos os dados associados serão removidos.`}
      onConfirm={confirmDelete}
      onCancel={() => setConfirmState({ open: false, alunoId: null, alunoNome: '' })}
    />
    <ConfirmModal
      open={confirmBulk}
      message={`Excluir ${selected.size} aluno${selected.size !== 1 ? 's' : ''} selecionado${selected.size !== 1 ? 's' : ''}? Todos os dados associados serão removidos.`}
      onConfirm={confirmBulkDelete}
      onCancel={() => setConfirmBulk(false)}
    />
    <Toast toasts={toasts} />
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Alunos</h1>
        {!loading && (
          <p className="text-sm text-slate-500 mt-0.5">
            {alunos.length} alunos · <span className="text-red-600 font-medium">{emRiscoCount} em risco</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Buscar por nome..."
          value={q}
          onChange={e => set('q', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        {[
          { key: 'turma', label: 'Turma', opts: filtros.turmas },
          { key: 'serie', label: 'Série', opts: filtros.series },
          { key: 'curso', label: 'Curso', opts: filtros.cursos },
        ].map(({ key, label, opts }) => (
          <select
            key={key}
            value={params.get(key) || ''}
            onChange={e => set(key, e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">{label}: Todos</option>
            {(opts || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        <span
          className={`${CHIP_BASE} ${risco === 'alto' ? CHIP_ACTIVE : CHIP_INACTIVE}`}
          onClick={() => toggleRisco('alto')}
        >
          🔴 Alto risco
        </span>
        <span
          className={`${CHIP_BASE} ${risco === 'medio' ? CHIP_ACTIVE : CHIP_INACTIVE}`}
          onClick={() => toggleRisco('medio')}
        >
          🟠 Em risco
        </span>
        <span
          className={`${CHIP_BASE} ${risco === '' && false ? CHIP_ACTIVE : CHIP_INACTIVE}`}
          onClick={() => set('risco', '')}
        >
          🟢 Regular
        </span>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
          <span className="font-medium text-red-700">
            {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setConfirmBulk(true)}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Excluir selecionados
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1 text-slate-600 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Limpar seleção
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={alunos.length > 0 && selected.size === alunos.length}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < alunos.length; }}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                    disabled={loading || alunos.length === 0}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Turma</th>
                <th className="px-4 py-3 font-medium">Série</th>
                <th className="px-4 py-3 font-medium">Faltas inj.</th>
                <th className="px-4 py-3 font-medium">Responsáveis</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
              ) : alunos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              ) : (
                alunos.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => navigate('/alunos/' + a.id)}
                    className={`cursor-pointer hover:bg-slate-50 transition-colors ${rowBorderStyle(a.faltas_injustificadas)}`}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{a.turma || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.serie || '—'}</td>
                    <td className={faltasCellStyle(a.faltas_injustificadas)}>{a.faltas_injustificadas}</td>
                    <td className="px-4 py-3">
                      {a.total_responsaveis > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          {a.total_responsaveis} cadastrado{a.total_responsaveis > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Sem responsável
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={riskBadgeStyle(a.faltas_injustificadas)}>
                        {riskLabel(a.faltas_injustificadas)}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleDelete(e, a.id, a.nome)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} encontrado{alunos.length !== 1 ? 's' : ''}</p>
    </div>
    </>
  );
}
