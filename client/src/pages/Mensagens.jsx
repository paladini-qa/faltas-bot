import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import * as I from '../components/icons.jsx';
import { Avatar, initials, riskKey } from '../components/atoms.jsx';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

export default function Mensagens() {
  const [modo, setModo] = useState('aluno');
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [alunoSel, setAlunoSel] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [turmaSel, setTurmaSel] = useState('');
  const [alunosDaTurma, setAlunosDaTurma] = useState([]);
  const [templates, setTemplates] = useState(null);
  const [tplKey, setTplKey] = useState('mensal');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [waStatus, setWaStatus] = useState(null);
  const { toasts, toast } = useToast();
  const debounceRef = useRef(null);

  useEffect(() => {
    api.filtros().then(d => setTurmas(d.turmas || [])).catch(() => {});
    api.configuracoes().then(d => setTemplates(d)).catch(() => {});
    api.whatsappStatus().then(d => setWaStatus(d.status)).catch(() => {});
  }, []);

  useEffect(() => {
    if (alunoSel) return;
    if (query.length < 2) { setResultados([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBuscando(true);
      api.alunos({ q: query }).then(d => setResultados(d)).catch(() => setResultados([])).finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, alunoSel]);

  useEffect(() => {
    if (!turmaSel) { setAlunosDaTurma([]); return; }
    api.alunos({ turma: turmaSel }).then(setAlunosDaTurma).catch(() => setAlunosDaTurma([]));
  }, [turmaSel]);

  function applyTemplate(key) {
    setTplKey(key);
    if (!templates) return;
    const tmap = {
      consecutivas: templates.template_consecutivas || '',
      mensal: templates.template_mensal || '',
      alto: templates.template_mensal || '',
    };
    setMensagem(tmap[key] || '');
  }

  const previewAluno = alunoSel || (modo === 'aluno' ? resultados[0] : alunosDaTurma[0]) || null;
  const recipientCount = modo === 'aluno'
    ? (alunoSel?.responsaveis?.length || 1)
    : alunosDaTurma.filter(a => (a.responsaveis?.length || 0) > 0).length;

  function buildPreview(body, aluno) {
    if (!aluno || !body) return body || '';
    const resp = aluno.responsaveis?.[0]?.nome || 'responsavel';
    const nome = aluno.nome?.split(' ').slice(0, 2).join(' ') || 'Aluno';
    return body.replace(/\{responsavel\}/g, resp).replace(/\{aluno\}/g, nome).replace(/\{faltas\}/g, aluno.faltas_injustificadas || '0');
  }

  const previewText = buildPreview(mensagem, previewAluno);

  async function handleEnviar() {
    if (!mensagem.trim()) { toast.error('Escreva uma mensagem antes de enviar.'); return; }
    setEnviando(true);
    try {
      const payload = modo === 'aluno'
        ? { alunoId: alunoSel?.id, mensagemTemplate: mensagem }
        : { turma: turmaSel, mensagemTemplate: mensagem };
      await api.enviarMensagemManual(payload);
      toast.success('Mensagem enviada!');
      setMensagem('');
      setAlunoSel(null);
      setQuery('');
    } catch (e) { toast.error(e.message); }
    finally { setEnviando(false); }
  }

  return (
    <>
      <div className="fb-main">
        <div className="fb-page-header">
          <div>
            <h1 className="fb-page-title">Mensagem Manual</h1>
            <div className="fb-page-sub">Envie uma mensagem WhatsApp para responsaveis de um aluno ou turma inteira.</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Step 1 */}
            <div className="fb-card">
              <div className="fb-card-head">
                <div className="fb-row" style={{ gap: 10 }}>
                  <div className="fb-step-num">1</div>
                  <div className="fb-card-title">Destinatario</div>
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <div className="fb-seg" style={{ marginBottom: 14 }}>
                  <button className={modo === 'aluno' ? 'on' : ''} onClick={() => setModo('aluno')}><I.User /> Aluno especifico</button>
                  <button className={modo === 'turma' ? 'on' : ''} onClick={() => setModo('turma')}><I.Users /> Turma inteira</button>
                </div>
                {modo === 'aluno' ? (
                  <div style={{ position: 'relative' }}>
                    <div className="fb-input-wrap">
                      <I.Search />
                      <input
                        className="fb-input"
                        placeholder="Digite o nome do aluno..."
                        value={alunoSel ? alunoSel.nome : query}
                        onChange={e => { setQuery(e.target.value); setAlunoSel(null); }}
                      />
                    </div>
                    {!alunoSel && resultados.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto' }}>
                        {resultados.slice(0, 8).map(a => {
                          const risk = riskKey(a.faltas_injustificadas);
                          return (
                            <button key={a.id} onClick={() => { setAlunoSel(a); setQuery(''); setResultados([]); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--border)', textAlign: 'left' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Avatar initials={initials(a.nome)} risk={risk} />
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{a.nome}</div>
                                <div className="fb-muted-3" style={{ fontSize: 12 }}>{a.turma} · {a.faltas_injustificadas} faltas</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {alunoSel && (
                      <button className="fb-btn fb-btn-ghost fb-btn-sm" style={{ marginTop: 8 }} onClick={() => { setAlunoSel(null); setQuery(''); }}>
                        <I.X /> Remover selecao
                      </button>
                    )}
                  </div>
                ) : (
                  <select className="fb-select" value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
                    <option value="">Selecionar turma...</option>
                    {turmas.map(t => <option key={t}>{t}</option>)}
                  </select>
                )}
                <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <I.User size={12} style={{ color: 'var(--text-3)' }} />
                  Mensagem sera enviada a <strong style={{ color: 'var(--text)' }}>{recipientCount}</strong> responsavel{recipientCount !== 1 ? 'is' : ''}.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="fb-card">
              <div className="fb-card-head">
                <div className="fb-row" style={{ gap: 10 }}>
                  <div className="fb-step-num">2</div>
                  <div className="fb-card-title">Mensagem</div>
                </div>
                <div className="fb-row" style={{ gap: 8 }}>
                  <span className="fb-muted" style={{ fontSize: 12.5 }}>Template:</span>
                  <select className="fb-select" style={{ width: 'auto' }} value={tplKey} onChange={e => applyTemplate(e.target.value)}>
                    <option value="">-- escolher --</option>
                    <option value="consecutivas">3 consecutivas</option>
                    <option value="mensal">3 em 30 dias</option>
                    <option value="alto">Risco elevado</option>
                  </select>
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <textarea className="fb-textarea" rows="6" value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Escreva sua mensagem..." />
                <div className="fb-muted" style={{ fontSize: 12, marginTop: 10 }}>
                  Variaveis: <span className="fb-kbd">{'{responsavel}'}</span> <span className="fb-kbd">{'{aluno}'}</span> <span className="fb-kbd">{'{faltas}'}</span> serao substituidas individualmente.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="fb-card">
              <div className="fb-card-head">
                <div className="fb-row" style={{ gap: 10 }}>
                  <div className="fb-step-num">3</div>
                  <div className="fb-card-title">Confirmar envio</div>
                </div>
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="fb-muted" style={{ fontSize: 13 }}>
                  Pronto para enviar para <strong style={{ color: 'var(--text)' }}>{recipientCount}</strong> destinatario{recipientCount !== 1 ? 's' : ''}.
                </span>
                <div style={{ flex: 1 }} />
                {waStatus !== 'conectado' && (
                  <span className="fb-pill fb-pill-warning"><span className="fb-pill-dot" />WhatsApp desconectado</span>
                )}
                <button className="fb-btn fb-btn-primary" onClick={handleEnviar} disabled={enviando || waStatus !== 'conectado'}>
                  <I.Send /> {enviando ? 'Enviando...' : 'Enviar agora'}
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp preview */}
          <div className="fb-card" style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
            <div className="fb-card-head">
              <div className="fb-card-title">Preview</div>
              <span className="fb-pill fb-pill-success"><I.Whatsapp size={12} /> WhatsApp</span>
            </div>
            <div style={{ padding: 18, background: 'oklch(0.95 0.015 145)', borderRadius: '0 0 14px 14px' }}>
              {previewAluno ? (
                <>
                  <div className="fb-row" style={{ gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid oklch(0.9 0.02 145)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--success)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                      {initials(previewAluno.responsaveis?.[0]?.nome || previewAluno.nome)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{previewAluno.responsaveis?.[0]?.nome || 'Responsavel'}</div>
                      <div className="fb-muted-3 fb-num" style={{ fontSize: 11 }}>{previewAluno.responsaveis?.[0]?.telefone || '+55 51 9xxxx-xxxx'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <div style={{ background: 'white', padding: '10px 14px 8px', borderRadius: '12px 12px 12px 4px', maxWidth: '92%', boxShadow: '0 1px 1px oklch(0 0 0 / 0.08)', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {previewText || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Escreva uma mensagem acima...</span>}
                      <div style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>agora ✓✓</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
                  Selecione um aluno ou turma para ver o preview
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <span className="fb-muted" style={{ fontSize: 11.5, background: 'white', padding: '3px 10px', borderRadius: 6 }}>Preview · nao enviado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast toasts={toasts} />
    </>
  );
}
