import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { RiskPill } from '../components/atoms.jsx';

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
    <div className="fb-main" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, width: 96, background: 'var(--border)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: 28, width: 256, background: 'var(--border)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        <div className="fb-row" style={{ gap: 8 }}>
          <div style={{ height: 20, width: 80, background: 'var(--border)', borderRadius: 999, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 20, width: 64, background: 'var(--border)', borderRadius: 999, animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
        <div className="fb-card fb-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 20, width: 128, background: 'var(--border)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 48, background: 'var(--bg-alt)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 48, background: 'var(--bg-alt)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
        </div>
        <div className="fb-card fb-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 20, width: 160, background: 'var(--border)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 96, background: 'var(--bg-alt)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    </div>
  );
}

function riskKey(faltas) {
  return faltas >= 10 ? 'alto' : faltas >= 5 ? 'risco' : 'regular';
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
  if (error) return (
    <div className="fb-main">
      <p style={{ color: 'var(--danger-text)' }}>{error}</p>
    </div>
  );
  if (!aluno) return null;

  const grouped = groupByDisciplina(aluno.faltas || []);
  const totalFaltas = (aluno.faltas || []).length;
  const injustificadas = aluno.faltas_injustificadas ?? 0;
  const responsaveis = aluno.responsaveis || [];
  const risk = riskKey(injustificadas);

  return (
    <div className="fb-main" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Toast toasts={toasts} />

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm || (() => {})}
        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: null })}
      />

      {/* Page header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link
          to="/alunos"
          style={{ color: 'var(--primary)', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}
        >
          ← Alunos
        </Link>

        {!editingAluno ? (
          <div className="fb-row-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 className="fb-page-title">{aluno.nome}</h1>
              <div className="fb-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {aluno.turma && (
                  <span className="fb-pill fb-pill-neutral">{aluno.turma}</span>
                )}
                {aluno.serie && (
                  <span className="fb-pill fb-pill-neutral">{aluno.serie}</span>
                )}
                {aluno.curso && (
                  <span className="fb-pill fb-pill-neutral">{aluno.curso}</span>
                )}
                <RiskPill risk={risk} />
                <span className="fb-muted" style={{ fontSize: 12.5 }}>
                  {injustificadas} falta{injustificadas !== 1 ? 's' : ''} injustificada{injustificadas !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="fb-row" style={{ gap: 8, flexShrink: 0, marginTop: 4 }}>
              <button
                className="fb-btn fb-btn-ghost fb-btn-sm"
                onClick={() => setEditingAluno(true)}
              >
                Editar
              </button>
              <button
                className="fb-btn fb-btn-danger fb-btn-sm"
                onClick={handleDeleteAluno}
              >
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveAluno} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Editar aluno</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fb-field-label">Nome</label>
                <input
                  required
                  className="fb-input"
                  value={alunoForm.nome}
                  onChange={e => setAlunoForm(f => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div>
                <label className="fb-field-label">Turma</label>
                <input
                  className="fb-input"
                  value={alunoForm.turma}
                  onChange={e => setAlunoForm(f => ({ ...f, turma: e.target.value }))}
                />
              </div>
              <div>
                <label className="fb-field-label">Série</label>
                <input
                  className="fb-input"
                  value={alunoForm.serie}
                  onChange={e => setAlunoForm(f => ({ ...f, serie: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fb-field-label">Curso</label>
                <input
                  className="fb-input"
                  value={alunoForm.curso}
                  onChange={e => setAlunoForm(f => ({ ...f, curso: e.target.value }))}
                />
              </div>
            </div>
            <div className="fb-row" style={{ gap: 8 }}>
              <button type="submit" className="fb-btn fb-btn-primary">Salvar</button>
              <button type="button" className="fb-btn fb-btn-secondary" onClick={() => setEditingAluno(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT: Guardians panel */}
        <div className="fb-card" style={{ overflow: 'hidden' }}>
          {/* Card header */}
          <div className="fb-card-head">
            <span className="fb-card-title">Responsáveis</span>
            <span className={`fb-pill ${responsaveis.length > 0 ? 'fb-pill-success' : 'fb-pill-danger'}`}>
              {responsaveis.length}
            </span>
          </div>

          {/* Guardian list */}
          {responsaveis.length === 0 ? (
            <p className="fb-muted" style={{ fontSize: 13, padding: '12px 20px' }}>Nenhum responsável cadastrado.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {responsaveis.map(r => (
                <li key={r.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 20px' }}>
                  {editingRespId === r.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        className="fb-input"
                        value={respEditForm.nome}
                        onChange={e => setRespEditForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome"
                      />
                      <input
                        className="fb-input"
                        value={respEditForm.telefone}
                        onChange={e => setRespEditForm(f => ({ ...f, telefone: e.target.value }))}
                        placeholder="Telefone"
                      />
                      <div className="fb-row" style={{ gap: 8 }}>
                        <button
                          className="fb-btn fb-btn-primary fb-btn-sm"
                          onClick={() => handleSaveResp(r.id)}
                        >
                          Salvar
                        </button>
                        <button
                          className="fb-btn fb-btn-secondary fb-btn-sm"
                          onClick={() => setEditingRespId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="fb-row-between">
                      <div>
                        <p style={{ fontWeight: 500, margin: 0, fontSize: 13.5 }}>{r.nome}</p>
                        <p className="fb-muted-3" style={{ margin: 0, fontSize: 12.5, fontFamily: 'var(--font-mono)' }}>{r.telefone}</p>
                      </div>
                      <div className="fb-row" style={{ gap: 8 }}>
                        <button
                          className="fb-btn fb-btn-ghost fb-btn-sm"
                          onClick={() => { setEditingRespId(r.id); setRespEditForm({ nome: r.nome, telefone: r.telefone }); }}
                        >
                          Editar
                        </button>
                        <button
                          className="fb-btn fb-btn-danger fb-btn-sm"
                          onClick={() => handleDeleteResp(r.id)}
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
          <div style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
            <p className="fb-eyebrow" style={{ marginBottom: 12 }}>Adicionar responsável</p>
            <form onSubmit={addResponsavel} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label className="fb-field-label">Nome</label>
                <input
                  required
                  className="fb-input"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <label className="fb-field-label">Telefone WhatsApp</label>
                <input
                  required
                  className="fb-input"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="5545999999999"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="fb-btn fb-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Absences by subject */}
        <div className="fb-card" style={{ overflow: 'hidden' }}>
          {/* Card header */}
          <div className="fb-card-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span className="fb-card-title">Faltas por disciplina</span>
            <p className="fb-muted-3" style={{ margin: 0, fontSize: 12.5 }}>
              {totalFaltas} total · {injustificadas} injustificada{injustificadas !== 1 ? 's' : ''}
            </p>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <p className="fb-muted" style={{ fontSize: 13, padding: '16px 20px' }}>Nenhuma falta registrada.</p>
          ) : (
            <div>
              {Object.entries(grouped).map(([disciplina, faltas], gi) => (
                <div
                  key={disciplina}
                  style={{ padding: '12px 20px', borderBottom: gi < Object.keys(grouped).length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div className="fb-row-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{disciplina}</span>
                    <AbsenceCountLabel count={faltas.length} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {faltas.map(f => (
                      <div key={f.id}>
                        {editingFaltaId === f.id ? (
                          <div className="fb-row" style={{ flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
                            <input
                              type="date"
                              className="fb-input"
                              style={{ width: 'auto', flex: '0 0 auto' }}
                              value={faltaEditForm.data?.slice(0, 10) || ''}
                              onChange={e => setFaltaEditForm(x => ({ ...x, data: e.target.value }))}
                            />
                            <input
                              className="fb-input"
                              style={{ width: 120, flex: '0 0 auto' }}
                              value={faltaEditForm.disciplina}
                              onChange={e => setFaltaEditForm(x => ({ ...x, disciplina: e.target.value }))}
                              placeholder="Disciplina"
                            />
                            <label className="fb-row" style={{ gap: 6, fontSize: 13, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={faltaEditForm.justificada}
                                onChange={e => setFaltaEditForm(x => ({ ...x, justificada: e.target.checked }))}
                              />
                              Justificada
                            </label>
                            <button
                              className="fb-btn fb-btn-primary fb-btn-sm"
                              onClick={() => handleSaveFalta(f.id)}
                            >
                              Salvar
                            </button>
                            <button
                              className="fb-btn fb-btn-secondary fb-btn-sm"
                              onClick={() => setEditingFaltaId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div
                            className="fb-row-between"
                            style={{ padding: '2px 0' }}
                            onMouseEnter={e => e.currentTarget.querySelector('.falta-actions').style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.querySelector('.falta-actions').style.opacity = '0'}
                          >
                            <div className="fb-row" style={{ gap: 8 }}>
                              <span className={`fb-pill ${f.justificada ? 'fb-pill-success' : 'fb-pill-danger'}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                {formatDate(f.data)}
                              </span>
                              {f.justificada && (
                                <span className="fb-muted" style={{ fontSize: 12 }}>Justificada</span>
                              )}
                            </div>
                            <div
                              className="falta-actions fb-row"
                              style={{ gap: 8, opacity: 0, transition: 'opacity .15s' }}
                            >
                              <button
                                className="fb-btn fb-btn-ghost fb-btn-sm"
                                onClick={() => { setEditingFaltaId(f.id); setFaltaEditForm({ data: f.data?.slice(0, 10) || '', disciplina: f.disciplina || '', justificada: f.justificada || false }); }}
                              >
                                Editar
                              </button>
                              <button
                                className="fb-btn fb-btn-danger fb-btn-sm"
                                onClick={() => handleDeleteFalta(f.id)}
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

function AbsenceCountLabel({ count }) {
  if (count >= 10) {
    return <span className="fb-pill fb-pill-danger fb-num">{count} faltas</span>;
  }
  if (count >= 5) {
    return <span className="fb-pill fb-pill-warning fb-num">{count} faltas</span>;
  }
  return <span className="fb-pill fb-pill-neutral fb-num">{count} falta{count !== 1 ? 's' : ''}</span>;
}
