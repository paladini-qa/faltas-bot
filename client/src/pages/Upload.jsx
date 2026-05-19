import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import * as I from '../components/icons.jsx';
import { Avatar, initials, riskKey } from '../components/atoms.jsx';

export default function Upload() {
  const [stage, setStage] = useState('idle'); // idle | uploading | parsed
  const [progress, setProgress] = useState(0);
  const [hover, setHover] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (stage === 'uploading') {
      const t = setInterval(() => {
        setProgress(p => { if (p >= 100) { clearInterval(t); return 100; } return p + 7; });
      }, 90);
      return () => clearInterval(t);
    }
  }, [stage]);

  async function handleFile(file) {
    if (!file) return;
    setProgress(0);
    setStage('uploading');
    setError(null);
    try {
      const data = await api.upload(file);
      setResult(data);
      setStage('parsed');
    } catch (e) {
      setError(e.message);
      setStage('idle');
    }
  }

  return (
    <div className="fb-main">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Importar PDF</h1>
          <div className="fb-page-sub">Faca upload do relatorio de frequencia exportado pelo sistema escolar.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        <div>
          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 10, marginBottom: 14, color: 'var(--danger-text)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {stage === 'idle' && (
            <div
              className="fb-card"
              style={{
                border: '1.5px dashed ' + (hover ? 'var(--primary)' : 'var(--border-strong)'),
                background: hover ? 'var(--primary-soft)' : 'var(--surface)',
                padding: '56px 28px',
                textAlign: 'center',
                transition: 'all .15s',
                cursor: 'pointer',
              }}
              onDragOver={e => { e.preventDefault(); setHover(true); }}
              onDragLeave={() => setHover(false)}
              onDrop={e => { e.preventDefault(); setHover(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('fb-file-input').click()}
            >
              <input id="fb-file-input" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
                <I.Upload size={24} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>Arraste o PDF aqui</div>
              <div className="fb-muted" style={{ marginBottom: 18, fontSize: 13.5 }}>ou clique para selecionar · arquivos ate 20 MB</div>
              <button className="fb-btn fb-btn-primary" onClick={e => { e.stopPropagation(); document.getElementById('fb-file-input').click(); }}>
                <I.FileIcon /> Selecionar arquivo
              </button>
            </div>
          )}

          {stage === 'uploading' && (
            <div className="fb-card fb-card-pad-lg">
              <div className="fb-row" style={{ gap: 14, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
                  <I.FileIcon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Enviando arquivo...</div>
                  <div className="fb-muted-3 fb-num" style={{ fontSize: 12 }}>Processando PDF</div>
                </div>
                <div className="fb-num" style={{ fontWeight: 500 }}>{progress}%</div>
              </div>
              <div style={{ height: 6, background: 'var(--bg-alt)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: progress + '%', height: '100%', background: 'var(--primary)', transition: 'width .12s' }} />
              </div>
              <div className="fb-muted" style={{ fontSize: 12, marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                <I.Sparkle size={12} /> Extraindo registros · cruzando com base de alunos...
              </div>
            </div>
          )}

          {stage === 'parsed' && result && (
            <div className="fb-card">
              <div className="fb-card-head">
                <div className="fb-row" style={{ gap: 10 }}>
                  <I.Check2 size={18} style={{ color: 'var(--success)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Processamento concluido</div>
                    <div className="fb-muted-3" style={{ fontSize: 12 }}>
                      {result.total || 0} registros · {result.novas_faltas || 0} novas faltas detectadas
                    </div>
                  </div>
                </div>
                <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => { setStage('idle'); setResult(null); }}>
                  <I.Refresh />
                </button>
              </div>
              {result.alunos && result.alunos.length > 0 && (
                <table className="fb-tbl">
                  <thead>
                    <tr><th>Aluno</th><th>Turma</th><th>Novas faltas</th><th>Acao</th></tr>
                  </thead>
                  <tbody>
                    {result.alunos.map((a, i) => {
                      const risk = riskKey(a.faltas_total || 0);
                      return (
                        <tr key={i}>
                          <td>
                            <div className="fb-row" style={{ gap: 10 }}>
                              <Avatar initials={initials(a.nome || '')} risk={risk} />
                              <span style={{ fontWeight: 500 }}>{a.nome}</span>
                            </div>
                          </td>
                          <td className="fb-muted">{a.turma || '-'}</td>
                          <td>
                            <span className="fb-num" style={{ fontWeight: 500, color: (a.novas_faltas || 0) > 0 ? 'var(--danger-text)' : 'var(--text-3)' }}>
                              {(a.novas_faltas || 0) > 0 ? '+' + a.novas_faltas : '-'}
                            </span>
                          </td>
                          <td>
                            {a.acao === 'alerta'
                              ? <span className="fb-pill fb-pill-warning"><I.Bell size={11} /> Enviar alerta</span>
                              : <span className="fb-pill fb-pill-success"><span className="fb-pill-dot" />OK</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <span className="fb-muted" style={{ fontSize: 13 }}>Import concluido com sucesso.</span>
                <div className="fb-row" style={{ gap: 8 }}>
                  <button className="fb-btn fb-btn-secondary" onClick={() => { setStage('idle'); setResult(null); }}>Novo import</button>
                  <button className="fb-btn fb-btn-primary" onClick={() => navigate('/alertas')}><I.Send /> Ver alertas</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fb-card fb-card-pad-lg" style={{ height: 'fit-content' }}>
          <div className="fb-eyebrow" style={{ marginTop: 0 }}>Como funciona</div>
          {[
            { n: 1, t: 'Upload do PDF', d: 'Aceitamos relatorios exportados do sistema escolar (SED, SIGEduc, etc.).' },
            { n: 2, t: 'Extracao automatica', d: 'Identificamos faltas injustificadas e cruzamos com a base de alunos.' },
            { n: 3, t: 'Alertas elegiveis', d: 'Aplicamos os limiares configurados e listamos os alunos para envio.' },
            { n: 4, t: 'Voce confirma', d: 'Revise antes do envio para responsaveis pelo WhatsApp.' },
          ].map(s => (
            <div key={s.n} className="fb-row" style={{ gap: 12, alignItems: 'flex-start', padding: '10px 0', borderTop: s.n === 1 ? 'none' : '1px solid var(--border)' }}>
              <div className="fb-step-num">{s.n}</div>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{s.t}</div>
                <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
