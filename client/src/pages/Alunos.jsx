import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import * as I from '../components/icons.jsx';
import { Avatar, RiskPill, Sparkline, initials, riskKey, riskColor } from '../components/atoms.jsx';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(new Set());
  const [view, setView] = useState('table');
  const [drawer, setDrawer] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const { toasts, toast } = useToast();
  const [showNovoAlunoModal, setShowNovoAlunoModal] = useState(false);
  const [novoAlunoForm, setNovoAlunoForm] = useState({ nome: '', turma: '', serie: '', curso: '', numero: '' });
  const [createloading, setCreateLoading] = useState(false);

  const q     = params.get('q') || '';
  const turma = params.get('turma') || '';
  const serie = params.get('serie') || '';
  const risco = params.get('risco') || '';

  useEffect(() => { api.filtros().then(setFiltros).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    api.alunos({ q, turma, serie, risco })
      .then(d => { setAlunos(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [q, turma, serie, risco]);
  useEffect(() => { setSelected(new Set()); }, [q, turma, serie, risco]);

  function set(key, val) {
    const n = new URLSearchParams(params);
    if (val) n.set(key, val); else n.delete(key);
    setParams(n);
  }

  const toggleSel = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === alunos.length && alunos.length > 0) setSelected(new Set());
    else setSelected(new Set(alunos.map(s => s.id)));
  };

  async function confirmBulkDelete() {
    try {
      await api.deleteAlunosBulk([...selected]);
      setAlunos(prev => prev.filter(a => !selected.has(a.id)));
      toast.success(selected.size + ' aluno' + (selected.size !== 1 ? 's' : '') + ' excluído' + (selected.size !== 1 ? 's' : ''));
      setSelected(new Set());
    } catch (e) {
      toast.error(e.message);
    }
    setConfirmBulk(false);
  }

  const emRiscoCount = alunos.filter(a => a.faltas_injustificadas >= 5).length;

  return (
    <>
      <div className="fb-main">
        <div className="fb-page-header">
          <div>
            <h1 className="fb-page-title">Alunos</h1>
            <div className="fb-page-sub">
              {alunos.length} alunos ·{' '}
              <span style={{ color: emRiscoCount ? 'var(--danger-text)' : 'var(--success-text)', fontWeight: 500 }}>
                {emRiscoCount} em risco
              </span>
            </div>
          </div>
          <div className="fb-row">
            <button className="fb-btn fb-btn-secondary"><I.Download /> Exportar</button>
            <button className="fb-btn fb-btn-primary" onClick={() => setShowNovoAlunoModal(true)}><I.UserPlus /> Novo aluno</button>
          </div>
        </div>

        <div className="fb-card" style={{ marginBottom: 14 }}>
          <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="fb-input-wrap" style={{ flex: '1 1 260px', minWidth: 220 }}>
              <I.Search />
              <input className="fb-input" placeholder="Buscar por nome..." value={q} onChange={e => set('q', e.target.value)} />
            </div>
            <select className="fb-select" style={{ width: 140 }} value={turma} onChange={e => set('turma', e.target.value)}>
              <option value="">Todas as turmas</option>
              {(filtros.turmas || []).map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="fb-select" style={{ width: 130 }} value={serie} onChange={e => set('serie', e.target.value)}>
              <option value="">Todas as series</option>
              {(filtros.series || []).map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="fb-seg">
              <button className={!risco ? 'on' : ''} onClick={() => set('risco', '')}>Todos</button>
              <button className={risco === 'alto' ? 'on' : ''} onClick={() => set('risco', risco === 'alto' ? '' : 'alto')}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--danger)', display: 'block' }} /> Alto
              </button>
              <button className={risco === 'risco' ? 'on' : ''} onClick={() => set('risco', risco === 'risco' ? '' : 'risco')}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--warning)', display: 'block' }} /> Risco
              </button>
            </div>
            <div className="fb-seg">
              <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}><I.List /></button>
              <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}><I.Grid /></button>
            </div>
          </div>
          {selected.size > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 500, color: 'var(--primary-text)' }}>{selected.size} selecionados</span>
              <div style={{ flex: 1 }} />
              <button className="fb-btn fb-btn-sm fb-btn-secondary" onClick={() => navigate('/mensagens')}><I.Send /> Enviar mensagem</button>
              <button className="fb-btn fb-btn-sm fb-btn-danger" onClick={() => setConfirmBulk(true)}><I.Trash /> Excluir</button>
              <button className="fb-btn fb-btn-sm fb-btn-ghost" onClick={() => setSelected(new Set())}><I.X /></button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>Carregando...</div>
        ) : view === 'table' ? (
          <div className="fb-card">
            <table className="fb-tbl">
              <thead>
                <tr>
                  <th style={{ width: 36, paddingLeft: 16 }}>
                    <input type="checkbox" checked={selected.size === alunos.length && alunos.length > 0} onChange={toggleAll} />
                  </th>
                  <th>Nome</th>
                  <th>Turma</th>
                  <th>Serie</th>
                  <th>Faltas inj.</th>
                  <th>Tendencia</th>
                  <th>Responsaveis</th>
                  <th>Status</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {alunos.map(s => {
                  const risk = riskKey(s.faltas_injustificadas);
                  const ini = initials(s.nome);
                  const monthly = Array.from({ length: 6 }, (_, m) => Math.max(0, Math.round(s.faltas_injustificadas / 6 * (0.4 + m * 0.12))));
                  return (
                    <tr key={s.id} onClick={() => setDrawer(s)} className={selected.has(s.id) ? 'sel' : ''}>
                      <td style={{ paddingLeft: 16 }} onClick={e => { e.stopPropagation(); toggleSel(s.id); }}>
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => {}} />
                      </td>
                      <td>
                        <div className="fb-row" style={{ gap: 10 }}>
                          <Avatar initials={ini} risk={risk} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{s.nome}</div>
                            <div className="fb-muted-3 fb-num" style={{ fontSize: 11 }}>#{s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="fb-muted">{s.turma || '-'}</td>
                      <td className="fb-muted">{s.serie || '-'}</td>
                      <td>
                        <span className="fb-num" style={{ fontWeight: 500, color: risk === 'alto' ? 'var(--danger-text)' : risk === 'risco' ? 'var(--warning-text)' : 'var(--text)' }}>
                          {s.faltas_injustificadas}
                        </span>
                      </td>
                      <td><Sparkline data={monthly} color={riskColor(risk)} width={70} height={22} /></td>
                      <td>
                        {(s.total_responsaveis > 0)
                          ? <span className="fb-pill fb-pill-success">{s.total_responsaveis} cadastrado{s.total_responsaveis > 1 ? 's' : ''}</span>
                          : <span className="fb-pill fb-pill-danger">Sem responsavel</span>}
                      </td>
                      <td><RiskPill risk={risk} /></td>
                      <td><I.Chevron size={14} style={{ color: 'var(--text-3)' }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {alunos.length === 0 && <EmptyState />}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {alunos.map(s => {
              const risk = riskKey(s.faltas_injustificadas);
              const ini = initials(s.nome);
              const monthly = Array.from({ length: 6 }, (_, m) => Math.max(0, Math.round(s.faltas_injustificadas / 6 * (0.4 + m * 0.12))));
              return (
                <div key={s.id} className="fb-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setDrawer(s)}>
                  <div className="fb-row" style={{ gap: 10, marginBottom: 12 }}>
                    <Avatar initials={ini} risk={risk} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</div>
                      <div className="fb-muted-3" style={{ fontSize: 11.5 }}>{s.turma} · {s.serie}</div>
                    </div>
                    <RiskPill risk={risk} />
                  </div>
                  <div className="fb-row-between" style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div className="fb-muted-3" style={{ fontSize: 11 }}>FALTAS INJ.</div>
                      <div className="fb-num" style={{ fontSize: 22, fontWeight: 500 }}>{s.faltas_injustificadas}</div>
                    </div>
                    <Sparkline data={monthly} color={riskColor(risk)} width={80} height={28} />
                  </div>
                </div>
              );
            })}
            {alunos.length === 0 && <div style={{ gridColumn: '1/-1' }}><EmptyState /></div>}
          </div>
        )}
      </div>

      {drawer && (
        <AlunoDrawer
          aluno={drawer}
          onClose={() => setDrawer(null)}
          onNavigate={() => { navigate('/alunos/' + drawer.id); setDrawer(null); }}
          onMessage={() => { navigate('/mensagens'); setDrawer(null); }}
        />
      )}

      <ConfirmModal
        open={confirmBulk}
        message={'Excluir ' + selected.size + ' aluno' + (selected.size !== 1 ? 's' : '') + '? Esta acao nao pode ser desfeita.'}
        onConfirm={confirmBulkDelete}
        onCancel={() => setConfirmBulk(false)}
      />

      {showNovoAlunoModal && (
        <NovoAlunoModal
          open={showNovoAlunoModal}
          onClose={() => {
            setShowNovoAlunoModal(false);
            setNovoAlunoForm({ nome: '', turma: '', serie: '', curso: '', numero: '' });
          }}
          form={novoAlunoForm}
          setForm={setNovoAlunoForm}
          saving={createloading}
          onSubmit={async (e) => {
            e.preventDefault();
            setCreateLoading(true);
            try {
              await api.createAluno({
                nome: novoAlunoForm.nome,
                turma: novoAlunoForm.turma,
                serie: novoAlunoForm.serie,
                curso: novoAlunoForm.curso,
                numero: novoAlunoForm.numero ? parseInt(novoAlunoForm.numero, 10) : null
              });
              toast.success('Aluno cadastrado com sucesso!');
              setShowNovoAlunoModal(false);
              setNovoAlunoForm({ nome: '', turma: '', serie: '', curso: '', numero: '' });
              // Refresh lists
              setLoading(true);
              api.alunos({ q, turma, serie, risco })
                .then(d => { setAlunos(d); setLoading(false); })
                .catch(() => setLoading(false));
              api.filtros().then(setFiltros).catch(() => {});
            } catch (err) {
              toast.error(err.message);
            } finally {
              setCreateLoading(false);
            }
          }}
        />
      )}

      <Toast toasts={toasts} />
    </>
  );
}

function AlunoDrawer({ aluno, onClose, onNavigate, onMessage }) {
  const [detail, setDetail] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadDetail = () => {
    api.aluno(aluno.id).then(setDetail).catch(() => {});
  };

  useEffect(() => {
    loadDetail();
  }, [aluno.id]);

  const s = detail || aluno;
  const risk = riskKey(s.faltas_injustificadas);
  const ini = initials(s.nome);
  const resps = s.responsaveis || [];
  const monthly = Array.from({ length: 6 }, (_, m) => Math.max(0, Math.round(s.faltas_injustificadas / 6 * (0.4 + m * 0.12))));
  const maxMonth = Math.max(1, ...monthly);

  return (
    <>
      <div className="fb-drawer-mask" onClick={onClose} />
      <div className="fb-drawer">
        <div className="fb-drawer-head">
          <div className="fb-row" style={{ gap: 12 }}>
            <Avatar initials={ini} risk={risk} size={36} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{s.nome}</div>
              <div className="fb-muted" style={{ fontSize: 12 }}>{s.turma} · {s.serie}</div>
            </div>
          </div>
          <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={onClose}><I.X /></button>
        </div>

        <div className="fb-drawer-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div className="fb-muted-3" style={{ fontSize: 10.5, textTransform: 'uppercase', fontWeight: 500, letterSpacing: '.06em' }}>Faltas inj.</div>
              <div className="fb-num" style={{ fontSize: 24, fontWeight: 500, marginTop: 4, color: risk === 'alto' ? 'var(--danger-text)' : undefined }}>{s.faltas_injustificadas}</div>
            </div>
            <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div className="fb-muted-3" style={{ fontSize: 10.5, textTransform: 'uppercase', fontWeight: 500, letterSpacing: '.06em' }}>Ultima falta</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{s.ultima_falta ? new Date(s.ultima_falta).toLocaleDateString('pt-BR') : '-'}</div>
            </div>
            <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div className="fb-muted-3" style={{ fontSize: 10.5, textTransform: 'uppercase', fontWeight: 500, letterSpacing: '.06em' }}>Status</div>
              <div style={{ marginTop: 6 }}><RiskPill risk={risk} /></div>
            </div>
          </div>

          <div className="fb-eyebrow">Tendencia (ultimos 6 meses)</div>
          <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24 }}>
            <div className="fb-bars" style={{ height: 80 }}>
              {monthly.map((v, i) => (
                <div key={i} className={'fb-bar' + (v >= 3 ? ' danger' : '')} style={{ height: (v / maxMonth * 100) + '%' }} />
              ))}
            </div>
            <div className="fb-row-between fb-muted-3" style={{ fontSize: 11, marginTop: 6 }}>
              <span>Dez</span><span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span>
            </div>
          </div>

          <div className="fb-row-between" style={{ marginBottom: 10 }}>
            <div className="fb-eyebrow" style={{ margin: 0 }}>Responsaveis</div>
            <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              <I.Plus /> Adicionar
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  await api.addResponsavel(s.id, form);
                  setForm({ nome: '', telefone: '' });
                  setShowAddForm(false);
                  toast.success('Responsável cadastrado com sucesso!');
                  loadDetail();
                } catch (err) {
                  toast.error(err.message);
                } finally {
                  setSaving(false);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '12px 14px',
                border: '1px dashed var(--border-strong)',
                borderRadius: 10,
                marginBottom: 12,
                background: 'var(--surface-2)'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>Adicionar Responsável</div>
              <div>
                <label className="fb-field-label" style={{ fontSize: 11, marginBottom: 3 }}>Nome</label>
                <input
                  required
                  className="fb-input fb-input-sm"
                  placeholder="Nome do responsável"
                  value={form.nome}
                  onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                  style={{ fontSize: 12.5, padding: '6px 10px' }}
                />
              </div>
              <div>
                <label className="fb-field-label" style={{ fontSize: 11, marginBottom: 3 }}>WhatsApp</label>
                <input
                  required
                  className="fb-input fb-input-sm"
                  placeholder="Ex: 5545999999999"
                  value={form.telefone}
                  onChange={e => setForm(prev => ({ ...prev, telefone: e.target.value }))}
                  style={{ fontSize: 12.5, padding: '6px 10px' }}
                />
              </div>
              <div className="fb-row" style={{ gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={saving} className="fb-btn fb-btn-primary fb-btn-sm" style={{ fontSize: 12 }}>
                  {saving ? 'Adicionando...' : 'Adicionar'}
                </button>
                <button type="button" className="fb-btn fb-btn-secondary fb-btn-sm" onClick={() => setShowAddForm(false)} style={{ fontSize: 12 }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {resps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {resps.map((r, i) => (
                <div key={i} className="fb-row" style={{ gap: 12, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--bg-alt)', display: 'grid', placeItems: 'center', color: 'var(--text-2)', flex: '0 0 34px' }}>
                    <I.User size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.nome}</div>
                    <div className="fb-muted-3 fb-num" style={{ fontSize: 12 }}>{r.telefone || '-'}</div>
                  </div>
                  <button className="fb-btn fb-btn-ghost fb-btn-sm"><I.Whatsapp /></button>
                  <button className="fb-btn fb-btn-ghost fb-btn-sm"><I.Phone /></button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '14px 16px', border: '1px dashed var(--border-strong)', borderRadius: 10, marginBottom: 22, background: 'var(--danger-soft)' }}>
              <div className="fb-row" style={{ gap: 10 }}>
                <I.AlertOct size={16} style={{ color: 'var(--danger-text)', flex: '0 0 16px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: 'var(--danger-text)' }}>Sem responsavel cadastrado</div>
                  <div style={{ fontSize: 12, color: 'var(--danger-text)', opacity: 0.85, marginTop: 2 }}>Alertas automaticos nao serao enviados.</div>
                </div>
              </div>
            </div>
          )}

          {(s.faltas || []).length > 0 && (
            <>
              <div className="fb-eyebrow">Historico recente</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {s.faltas.slice(0, 5).map((f, i) => (
                  <div key={i} className="fb-row" style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, gap: 10 }}>
                    <I.Calendar size={14} style={{ color: 'var(--text-3)' }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{new Date(f.data).toLocaleDateString('pt-BR')}</span>
                    <span className={'fb-pill ' + (f.justificada ? 'fb-pill-success' : 'fb-pill-danger')}>
                      <span className="fb-pill-dot" />{f.justificada ? 'Justificada' : 'Injustificada'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="fb-drawer-foot">
          <button className="fb-btn fb-btn-secondary" onClick={onClose}>Fechar</button>
          <button className="fb-btn fb-btn-secondary" onClick={onNavigate}><I.Eye /> Ver detalhe</button>
          <button className="fb-btn fb-btn-primary" onClick={onMessage}><I.Send /> Enviar mensagem</button>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-2)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
        <I.Search size={20} />
      </div>
      <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Nenhum aluno encontrado</div>
      <div>Tente ajustar os filtros ou termo de busca.</div>
    </div>
  );
}

function NovoAlunoModal({ open, onClose, form, setForm, saving, onSubmit }) {
  if (!open) return null;
  return (
    <div className="fb-modal-mask" onClick={onClose}>
      <div className="fb-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="fb-drawer-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <I.UserPlus size={18} style={{ color: 'var(--primary)' }} />
            <span>Cadastrar Novo Aluno</span>
          </div>
          <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={onClose}><I.X /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="fb-drawer-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="fb-field-label" style={{ fontWeight: 500, marginBottom: 4, display: 'block', fontSize: 12 }}>Nome Completo *</label>
              <input
                required
                className="fb-input"
                placeholder="Ex: João Silva Santos"
                value={form.nome}
                onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="fb-field-label" style={{ fontWeight: 500, marginBottom: 4, display: 'block', fontSize: 12 }}>Nº Chamada (opcional)</label>
                <input
                  type="number"
                  className="fb-input"
                  placeholder="Ex: 12"
                  value={form.numero}
                  onChange={e => setForm(prev => ({ ...prev, numero: e.target.value }))}
                />
              </div>
              <div>
                <label className="fb-field-label" style={{ fontWeight: 500, marginBottom: 4, display: 'block', fontSize: 12 }}>Turma</label>
                <input
                  className="fb-input"
                  placeholder="Ex: Tarde-A"
                  value={form.turma}
                  onChange={e => setForm(prev => ({ ...prev, turma: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="fb-field-label" style={{ fontWeight: 500, marginBottom: 4, display: 'block', fontSize: 12 }}>Série</label>
                <input
                  className="fb-input"
                  placeholder="Ex: 1ª série"
                  value={form.serie}
                  onChange={e => setForm(prev => ({ ...prev, serie: e.target.value }))}
                />
              </div>
              <div>
                <label className="fb-field-label" style={{ fontWeight: 500, marginBottom: 4, display: 'block', fontSize: 12 }}>Curso</label>
                <input
                  className="fb-input"
                  placeholder="Ex: Administração"
                  value={form.curso}
                  onChange={e => setForm(prev => ({ ...prev, curso: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="fb-drawer-foot" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="fb-btn fb-btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="fb-btn fb-btn-primary" disabled={saving}>
              {saving ? 'Cadastrando...' : 'Salvar Aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
