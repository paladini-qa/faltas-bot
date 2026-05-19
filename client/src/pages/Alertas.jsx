import { useEffect, useState } from 'react';
import { api } from '../api.js';
import * as I from '../components/icons.jsx';
import { Avatar, TipoPill, StatusPill, initials, riskKey } from '../components/atoms.jsx';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { useWhatsapp } from '../contexts/WhatsappContext.jsx';

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function normalizeTipo(tipo) {
  if (!tipo) return 'manual';
  if (tipo.includes('consec') || tipo === '3_consecutivas') return 'consecutivas';
  if (tipo.includes('30') || tipo.includes('5_faltas') || tipo === 'mensal') return 'mensal';
  return 'manual';
}

const WA_MAP = {
  conectado:     { bg: 'var(--success-soft)', border: 'oklch(0.85 0.08 155)', icon: 'var(--success)', text: 'var(--success-text)', label: 'WhatsApp Business conectado' },
  aguardando_qr: { bg: 'var(--warning-soft)', border: 'oklch(0.88 0.1 65)',   icon: 'var(--warning)', text: 'var(--warning-text)', label: 'Aguardando QR code' },
  desconectado:  { bg: 'var(--danger-soft)',  border: 'oklch(0.88 0.08 25)',   icon: 'var(--danger)',  text: 'var(--danger-text)',  label: 'WhatsApp desconectado' },
};

export default function Alertas() {
  const { waStatus: status, qrUrl: qrDataUrl, setWaStatus: setStatus } = useWhatsapp();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [desconectando, setDesconectando] = useState(false);
  const { toasts, toast } = useToast();

  useEffect(() => {
    api.alertas(100).then(d => { setAlertas(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleVerificar() {
    setLoadingPreview(true);
    try {
      const { pendentes } = await api.previewAlertas();
      setPreview(pendentes || []);
      setConfirming(true);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingPreview(false); }
  }

  async function handleEnviar() {
    setEnviando(true);
    setConfirming(false);
    try {
      const data = await api.enviarAlertas();
      toast.success(data.total + ' alerta(s) enviado(s)');
      const updated = await api.alertas(100);
      setAlertas(updated);
    } catch (e) { toast.error(e.message); }
    finally { setEnviando(false); }
  }

  async function handleDesconectar() {
    setDesconectando(true);
    try { await api.disconnectWhatsapp(); setStatus('desconectado'); toast.success('WhatsApp desconectado'); }
    catch (e) { toast.error(e.message); }
    finally { setDesconectando(false); }
  }

  async function doDeleteAlerta() {
    try {
      await api.deleteAlerta(confirmDelete.id);
      setAlertas(prev => prev.filter(x => x.id !== confirmDelete.id));
      toast.success('Alerta excluido');
    } catch (e) { toast.error(e.message); }
    setConfirmDelete({ open: false, id: null });
  }

  const filtered = alertas.filter(a => {
    if (filter === 'todos') return true;
    return normalizeTipo(a.tipo_alerta) === filter;
  });

  const wa = WA_MAP[status] || WA_MAP.desconectado;

  return (
    <>
      <div className="fb-main">
        <div className="fb-page-header">
          <div>
            <h1 className="fb-page-title">Alertas</h1>
            <div className="fb-page-sub">Historico e envio de notificacoes automaticas via WhatsApp.</div>
          </div>
          <div className="fb-row">
            <button className="fb-btn fb-btn-secondary"><I.Download /> Exportar CSV</button>
            <button
              className="fb-btn fb-btn-primary"
              disabled={loadingPreview || enviando || status !== 'conectado'}
              onClick={handleVerificar}
            >
              <I.Lightning /> {loadingPreview ? 'Carregando...' : enviando ? 'Enviando...' : 'Verificar e enviar'}
            </button>
          </div>
        </div>

        {/* WA status banner */}
        {status && (
          <div className="fb-card" style={{ marginBottom: 14, background: wa.bg, borderColor: wa.border }}>
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: wa.icon, color: 'white', display: 'grid', placeItems: 'center', flex: '0 0 36px' }}>
                <I.Whatsapp size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: wa.text }}>{wa.label}</div>
                {status === 'conectado' && (
                  <div style={{ fontSize: 12.5, color: wa.text, marginTop: 2 }}>Sessao ativa</div>
                )}
              </div>
              {status === 'conectado' && (
                <button className="fb-btn fb-btn-secondary" onClick={handleDesconectar} disabled={desconectando}>
                  <I.QR /> {desconectando ? 'Desconectando...' : 'Desconectar'}
                </button>
              )}
            </div>
            {status === 'aguardando_qr' && (
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" style={{ width: 160, height: 160 }} />
                  : <div className="fb-muted" style={{ fontSize: 13 }}>Gerando QR code...</div>}
                <div className="fb-muted-3" style={{ fontSize: 12 }}>Escaneie com o WhatsApp para conectar</div>
              </div>
            )}
          </div>
        )}

        {/* Filter strip */}
        <div className="fb-card" style={{ marginBottom: 14 }}>
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="fb-muted" style={{ fontSize: 12.5, marginRight: 4 }}>Filtrar:</span>
            <div className="fb-seg">
              <button className={filter === 'todos' ? 'on' : ''} onClick={() => setFilter('todos')}>
                Todos <span className="fb-num fb-muted" style={{ marginLeft: 4 }}>{alertas.length}</span>
              </button>
              <button className={filter === 'consecutivas' ? 'on' : ''} onClick={() => setFilter('consecutivas')}>Consecutivas</button>
              <button className={filter === 'mensal' ? 'on' : ''} onClick={() => setFilter('mensal')}>Mensal</button>
              <button className={filter === 'manual' ? 'on' : ''} onClick={() => setFilter('manual')}>Manual</button>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>Carregando...</div>
        ) : (
          <div className="fb-card">
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-2)' }}>
                Nenhum alerta encontrado.
              </div>
            ) : (
              <>
                <table className="fb-tbl">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Turma</th>
                      <th>Tipo</th>
                      <th>Canal</th>
                      <th>Enviado em</th>
                      <th style={{ width: 50 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const risk = riskKey(a.faltas_injustificadas || 0);
                      const ini = initials(a.aluno_nome || '');
                      const tipo = normalizeTipo(a.tipo_alerta);
                      return (
                        <tr key={a.id}>
                          <td>
                            <div className="fb-row" style={{ gap: 10 }}>
                              <Avatar initials={ini} risk={risk} />
                              <div>
                                <div style={{ fontWeight: 500 }}>{a.aluno_nome}</div>
                                <div className="fb-muted-3 fb-num" style={{ fontSize: 11 }}>#{a.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="fb-muted">{a.turma || '-'}</td>
                          <td><TipoPill tipo={tipo} /></td>
                          <td>
                            <div className="fb-row fb-muted" style={{ gap: 6, fontSize: 13 }}>
                              <I.Whatsapp size={14} /> WhatsApp
                            </div>
                          </td>
                          <td className="fb-muted fb-num" style={{ fontSize: 13 }}>{formatDate(a.enviado_em)}</td>
                          <td>
                            <button
                              className="fb-btn fb-btn-ghost fb-btn-sm"
                              onClick={e => { e.stopPropagation(); setConfirmDelete({ open: true, id: a.id }); }}
                            >
                              <I.Trash />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', fontSize: 12.5 }}>
                  <span>{filtered.length} alerta{filtered.length !== 1 ? 's' : ''}</span>
                  <span>Ultimos registros</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirm send modal */}
      {confirming && (
        <div className="fb-modal-mask" onClick={() => setConfirming(false)}>
          <div className="fb-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px 4px' }}>
              <div className="fb-row" style={{ gap: 12, marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flex: '0 0 38px' }}>
                  <I.Lightning size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>Verificar e enviar alertas</div>
                  <div className="fb-muted" style={{ fontSize: 13 }}>Avaliar alunos pelos limiares atuais.</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 24px' }}>
              {preview.length === 0 ? (
                <div className="fb-muted" style={{ padding: '12px 0', fontSize: 13 }}>Nenhum alerta pendente para enviar.</div>
              ) : (
                <>
                  <div className="fb-muted" style={{ fontSize: 13, marginBottom: 10 }}>{preview.length} alerta(s) serao enviados:</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                    {preview.map((p, i) => (
                      <div key={i} className="fb-row-between" style={{ padding: '10px 14px', borderBottom: i < preview.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{p.aluno}</span>
                        <div className="fb-row" style={{ gap: 8 }}>
                          <TipoPill tipo={normalizeTipo(p.tipo)} />
                          <span className="fb-muted-3 fb-num" style={{ fontSize: 12 }}>{p.responsaveis} resp.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: '16px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="fb-btn fb-btn-secondary" onClick={() => setConfirming(false)}>Cancelar</button>
              {preview.length > 0 && (
                <button className="fb-btn fb-btn-primary" onClick={handleEnviar}>
                  <I.Send /> Enviar {preview.length} mensagem{preview.length !== 1 ? 'ns' : ''}
                </button>
              )}
              {preview.length === 0 && (
                <button className="fb-btn fb-btn-secondary" onClick={() => setConfirming(false)}>Fechar</button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        message="Excluir este registro de alerta?"
        onConfirm={doDeleteAlerta}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />
      <Toast toasts={toasts} />
    </>
  );
}
