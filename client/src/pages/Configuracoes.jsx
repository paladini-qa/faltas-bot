import { useState, useEffect } from 'react';
import { api } from '../api.js';
import * as I from '../components/icons.jsx';
import { Toggle } from '../components/atoms.jsx';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const SECTIONS = [
  ['limiares',    'Limiares de alerta', <I.AlertOct size={14} />],
  ['templates',   'Templates',          <I.Inbox size={14} />],
  ['envio',       'Regras de envio',    <I.Send size={14} />],
  ['integracoes', 'Integracoes',        <I.Whatsapp size={14} />],
];

export default function Configuracoes() {
  const [active, setActive] = useState('limiares');
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toasts, toast } = useToast();

  useEffect(() => {
    api.configuracoes().then(d => setCfg(d || {})).catch(() => setCfg({}));
  }, []);

  function set(key, val) { setCfg(prev => ({ ...prev, [key]: val })); }

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveConfiguracoes(cfg);
      toast.success('Configuracoes salvas!');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (!cfg) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Carregando...</div>;

  const previewBody = (b = '') =>
    b.replace(/\{responsavel\}/g, 'Maria').replace(/\{aluno\}/g, 'Joao').replace(/\{faltas\}/g, '3');

  return (
    <>
      <div className="fb-main">
        <div className="fb-page-header">
          <div>
            <h1 className="fb-page-title">Configuracoes</h1>
            <div className="fb-page-sub">Limiares de alerta, templates de mensagem e regras de envio.</div>
          </div>
          <button className="fb-btn fb-btn-primary" onClick={handleSave} disabled={saving}>
            <I.Check /> {saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 20, height: 'fit-content' }}>
            {SECTIONS.map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 12px', borderRadius: 8,
                  border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 500,
                  background: active === key ? 'var(--primary-soft)' : 'transparent',
                  color: active === key ? 'var(--primary-text)' : 'var(--text-2)',
                  transition: 'background .12s, color .12s',
                }}
              >
                {icon}<span>{label}</span>
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {active === 'limiares' && (
              <div className="fb-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600 }}>Limiares de alerta</div>
                  <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>Quantidade de faltas injustificadas que dispara o envio automatico.</div>
                </div>
                <div style={{ padding: '4px 20px' }}>
                  {[
                    { label: 'Faltas consecutivas', desc: 'Faltas seguidas dentro de 3 dias uteis', key: 'threshold_consecutivas', def: 3 },
                    { label: 'Faltas em 30 dias', desc: 'Faltas injustificadas acumuladas no ultimo mes', key: 'threshold_mensal', def: 5 },
                  ].map((row, i) => {
                    const v = Number(cfg[row.key] ?? row.def);
                    return (
                      <div key={row.key} className="fb-row-between" style={{ padding: '16px 0', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{row.label}</div>
                          <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{row.desc}</div>
                        </div>
                        <div className="fb-row" style={{ gap: 8 }}>
                          <button className="fb-btn fb-btn-secondary fb-btn-sm" onClick={() => set(row.key, Math.max(1, v - 1))}>-</button>
                          <input
                            type="number"
                            className="fb-input fb-num"
                            min="1"
                            style={{
                              fontWeight: 600,
                              fontSize: 18,
                              width: 64,
                              textAlign: 'center',
                              padding: '4px 0',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                            value={v}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              set(row.key, isNaN(val) ? '' : Math.max(1, val));
                            }}
                            onBlur={e => {
                              const val = parseInt(e.target.value, 10);
                              set(row.key, isNaN(val) || val < 1 ? row.def : val);
                            }}
                          />
                          <button className="fb-btn fb-btn-secondary fb-btn-sm" onClick={() => set(row.key, v + 1)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {active === 'envio' && (
              <div className="fb-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600 }}>Regras de envio</div>
                  <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>Quando e como os alertas sao disparados.</div>
                </div>
                <div style={{ padding: '4px 20px' }}>
                  <Toggle
                    label="Envio automatico"
                    desc="Disparar alertas assim que o limiar e atingido."
                    value={cfg.envio_automatico ?? true}
                    onChange={v => set('envio_automatico', v)}
                  />
                  <Toggle
                    label="Respeitar horario comercial"
                    desc="Nao enviar entre 19h e 8h, nem em fins de semana."
                    value={cfg.horario_comercial ?? true}
                    onChange={v => set('horario_comercial', v)}
                  />
                </div>
              </div>
            )}

            {active === 'templates' && (
              <div className="fb-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600 }}>Templates de mensagem</div>
                  <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    Variaveis: <span className="fb-kbd">{'{responsavel}'}</span> <span className="fb-kbd">{'{aluno}'}</span> <span className="fb-kbd">{'{faltas}'}</span>
                  </div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {[
                    { tag: 'consecutivas', tagCls: 'fb-pill-warning', label: 'Faltas consecutivas', key: 'template_consecutivas' },
                    { tag: 'mensal',       tagCls: 'fb-pill-info',    label: 'Faltas em 30 dias',   key: 'template_mensal' },
                  ].map((t, i) => (
                    <div key={t.key} style={{ marginBottom: i < 1 ? 20 : 0 }}>
                      <div className="fb-row" style={{ gap: 8, marginBottom: 6 }}>
                        <span className={'fb-pill ' + t.tagCls}>{t.label}</span>
                      </div>
                      <textarea
                        className="fb-textarea"
                        rows="3"
                        value={cfg[t.key] || ''}
                        onChange={e => set(t.key, e.target.value)}
                        placeholder="Digite o template de mensagem..."
                      />
                      {cfg[t.key] && (
                        <div className="fb-muted-3" style={{ fontSize: 12, marginTop: 6 }}>
                          <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>Preview:</span> {previewBody(cfg[t.key])}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active === 'integracoes' && (
              <div className="fb-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600 }}>Integracoes</div>
                  <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>Configuracoes de conexao com servicos externos.</div>
                </div>
                <div style={{ padding: '20px' }}>
                  <div className="fb-row" style={{ gap: 14, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', flex: '0 0 40px' }}>
                      <I.Whatsapp size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>WhatsApp Business</div>
                      <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>Conexao via QR code na pagina de Alertas.</div>
                    </div>
                    <span className="fb-pill fb-pill-success"><span className="fb-pill-dot" />Ativo</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast toasts={toasts} />
    </>
  );
}
