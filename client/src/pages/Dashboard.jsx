import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import * as I from '../components/icons.jsx';
import { Avatar, Sparkline, RiskPill, initials, riskKey, riskColor } from '../components/atoms.jsx';

function formatDate() {
  const raw = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// Deterministic fake 30-day trend seeded from total
function makeTrend(total = 0) {
  const seed = [2,1,3,0,4,2,1,5,3,2,4,6,2,1,3,4,2,5,3,2,4,7,5,3,2,4,3,5,8,6];
  const scale = total > 0 ? Math.max(0.5, total / 50) : 1;
  return seed.map(v => Math.round(v * scale));
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard().then(setStats).catch(() => {});
    api.alunos().then(setAlunos).catch(() => {});
  }, []);

  const trend = makeTrend(stats?.total_faltas);
  const maxTrend = Math.max(1, ...trend);

  const watchlist = [...alunos]
    .sort((a, b) => b.faltas_injustificadas - a.faltas_injustificadas)
    .slice(0, 5);

  const turmaGroups = alunos.reduce((acc, s) => {
    const t = s.turma || 'Sem turma';
    if (!acc[t]) acc[t] = { total: 0, risco: 0 };
    acc[t].total++;
    if (s.faltas_injustificadas >= 5) acc[t].risco++;
    return acc;
  }, {});
  const byTurma = Object.entries(turmaGroups).slice(0, 4);

  const dist = {
    regular: alunos.filter(s => s.faltas_injustificadas < 5).length,
    risco:   alunos.filter(s => s.faltas_injustificadas >= 5 && s.faltas_injustificadas < 10).length,
    alto:    alunos.filter(s => s.faltas_injustificadas >= 10).length,
  };
  const total = alunos.length || 1;

  return (
    <div className="fb-main">
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Dashboard</h1>
          <div className="fb-page-sub">{formatDate()} · Visão geral do dia</div>
        </div>
        <div className="fb-row">
          <button className="fb-btn fb-btn-secondary" onClick={() => window.location.reload()}>
            <I.Refresh /> Atualizar
          </button>
          <button className="fb-btn fb-btn-primary" onClick={() => navigate('/upload')}>
            <I.Upload /> Importar PDF
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard
          label="Total de Alunos"
          value={stats?.total_alunos ?? '—'}
          badge={<span className="fb-pill fb-pill-neutral">{byTurma.length} turmas</span>}
          foot={<><I.Dot size={10} /> matriculados</>}
        />
        <StatCard
          label="Faltas Injustificadas"
          value={stats?.total_faltas ?? '—'}
          valueColor="var(--danger-text)"
          badge={<Sparkline data={trend.slice(-14)} color="var(--danger)" width={80} height={24} />}
          foot={<span className="up">↑ vs. semana anterior</span>}
        />
        <StatCard
          label="Alunos em Risco"
          value={stats?.alunos_em_risco ?? '—'}
          valueColor="var(--warning-text)"
          badge={<span className="fb-pill fb-pill-warning"><span className="fb-pill-dot" />{dist.alto} alto</span>}
          foot={<><I.Dot size={10} /> com limiar atingido</>}
        />
        <StatCard
          label="Alertas Enviados"
          value={stats?.total_alertas ?? '—'}
          valueColor="var(--success-text)"
          badge={<span className="fb-pill fb-pill-success"><span className="fb-pill-dot" />total</span>}
          foot={<span className="down">↓ automáticos</span>}
        />
      </div>

      {/* Chart + actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 18 }}>
        {/* Trend chart */}
        <div className="fb-card">
          <div className="fb-card-head">
            <div>
              <div className="fb-card-title">Faltas nos últimos 30 dias</div>
              <div className="fb-muted" style={{ fontSize: 12, marginTop: 2 }}>Total acumulado por dia · todas as turmas</div>
            </div>
          </div>
          <div style={{ padding: '18px 20px 22px' }}>
            <div className="fb-bars" style={{ height: 160 }}>
              {trend.map((v, i) => (
                <div
                  key={i}
                  className={'fb-bar' + (v >= 5 ? ' danger' : '')}
                  style={{ height: ((v / maxTrend) * 100) + '%' }}
                  title={`Dia ${i + 1}: ${v} faltas`}
                />
              ))}
            </div>
            <div className="fb-row-between fb-muted-3" style={{ fontSize: 11, marginTop: 8 }}>
              <span>20 abr</span><span>27 abr</span><span>4 mai</span><span>11 mai</span><span>18 mai</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="fb-card">
          <div className="fb-card-head">
            <div className="fb-card-title">Ações rápidas</div>
          </div>
          <div style={{ padding: '8px 0' }}>
            {[
              { label: 'Importar novo PDF', desc: 'Atualizar frequência', Icon: I.FileIcon, to: '/upload', kind: 'primary' },
              { label: 'Verificar e enviar alertas', desc: 'Notificar responsáveis', Icon: I.Bell, to: '/alertas', kind: 'warning' },
              { label: 'Ver todos os alunos', desc: 'Buscar e filtrar', Icon: I.Users, to: '/alunos', kind: 'info' },
              { label: 'Mensagem manual', desc: 'Enviar via WhatsApp', Icon: I.Send, to: '/mensagens', kind: 'success' },
            ].map(({ label, desc, Icon, to, kind }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px', width: '100%',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)', textAlign: 'left',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: `var(--${kind}-soft)`, color: `var(--${kind}-text)`,
                  display: 'grid', placeItems: 'center', flex: '0 0 34px',
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Watchlist + risk distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        {/* Watchlist */}
        <div className="fb-card">
          <div className="fb-card-head">
            <div className="fb-card-title">Watchlist — maior risco</div>
            <button className="fb-btn fb-btn-ghost fb-btn-sm" onClick={() => navigate('/alunos')}>
              Ver todos <I.Chevron size={12} />
            </button>
          </div>
          <table className="fb-tbl">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Aluno</th>
                <th>Turma</th>
                <th>Faltas</th>
                <th>Tendência</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map(s => {
                const risk = riskKey(s.faltas_injustificadas);
                const ini = initials(s.nome);
                return (
                  <tr key={s.id} onClick={() => navigate(`/alunos/${s.id}`)}>
                    <td>
                      <div className="fb-row" style={{ gap: 10 }}>
                        <Avatar initials={ini} risk={risk} />
                        <span style={{ fontWeight: 500 }}>{s.nome}</span>
                      </div>
                    </td>
                    <td className="fb-muted">{s.turma}</td>
                    <td>
                      <span className="fb-num" style={{ fontWeight: 500, color: s.faltas_injustificadas >= 10 ? 'var(--danger-text)' : 'var(--text)' }}>
                        {s.faltas_injustificadas}
                      </span>
                    </td>
                    <td>
                      <Sparkline data={[0,0,0,0,0,0].map((_, m) => Math.round(s.faltas_injustificadas / 6 * (0.5 + m * 0.1)))} color={riskColor(risk)} width={70} height={22} />
                    </td>
                    <td><RiskPill risk={risk} /></td>
                  </tr>
                );
              })}
              {watchlist.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 16px' }}>Nenhum aluno em risco</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* By turma */}
          <div className="fb-card">
            <div className="fb-card-head"><div className="fb-card-title">Por turma</div></div>
            <div style={{ padding: '8px 4px 12px' }}>
              {byTurma.map(([turma, { total: t, risco: r }]) => (
                <div key={turma} className="fb-row" style={{ padding: '8px 16px', gap: 12 }}>
                  <div style={{ minWidth: 70, fontSize: 13, fontWeight: 500 }}>{turma}</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-alt)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: (r / t * 100) + '%', height: '100%', background: 'linear-gradient(90deg, var(--warning), var(--danger))' }} />
                  </div>
                  <div className="fb-num fb-muted-3" style={{ fontSize: 12, minWidth: 50, textAlign: 'right' }}>{r}/{t}</div>
                </div>
              ))}
              {byTurma.length === 0 && <div className="fb-muted" style={{ padding: '12px 16px', fontSize: 13 }}>Sem dados</div>}
            </div>
          </div>

          {/* Risk distribution */}
          <div className="fb-card">
            <div className="fb-card-head"><div className="fb-card-title">Distribuição de risco</div></div>
            <div style={{ padding: '14px 20px 18px' }}>
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-alt)' }}>
                <div style={{ width: (dist.regular / total * 100) + '%', background: 'var(--success)' }} />
                <div style={{ width: (dist.risco / total * 100) + '%', background: 'var(--warning)' }} />
                <div style={{ width: (dist.alto / total * 100) + '%', background: 'var(--danger)' }} />
              </div>
              <div className="fb-row" style={{ gap: 16, marginTop: 12, fontSize: 12.5 }}>
                <LegendDot color="var(--success)" label="Regular" count={dist.regular} />
                <LegendDot color="var(--warning)" label="Em risco" count={dist.risco} />
                <LegendDot color="var(--danger)"  label="Alto"     count={dist.alto} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor, badge, foot }) {
  return (
    <div className="fb-card">
      <div className="fb-stat">
        <div className="fb-row-between">
          <div className="fb-stat-label">{label}</div>
          {badge}
        </div>
        <div className="fb-stat-value" style={valueColor ? { color: valueColor } : {}}>{value}</div>
        <div className="fb-stat-foot">{foot}</div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, count }) {
  return (
    <div className="fb-row" style={{ gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: '0 0 8px' }} />
      <span className="fb-muted">{label}</span>
      <span className="fb-num">{count}</span>
    </div>
  );
}
