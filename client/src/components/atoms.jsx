// Shared UI atoms used across all pages

export function RiskPill({ risk, faltas }) {
  const r = risk || (faltas >= 10 ? 'alto' : faltas >= 5 ? 'risco' : 'regular');
  const map = {
    regular: { cls: 'fb-pill-success', label: 'Regular' },
    risco:   { cls: 'fb-pill-warning', label: 'Em risco' },
    alto:    { cls: 'fb-pill-danger',  label: 'Alto risco' },
  };
  const m = map[r] || map.regular;
  return (
    <span className={`fb-pill ${m.cls}`}>
      <span className="fb-pill-dot" />
      {m.label}
    </span>
  );
}

export function StatusPill({ status }) {
  const map = {
    entregue: { cls: 'fb-pill-success', label: 'Entregue' },
    lida:     { cls: 'fb-pill-info',    label: 'Lida' },
    pendente: { cls: 'fb-pill-warning', label: 'Pendente' },
    falhou:   { cls: 'fb-pill-danger',  label: 'Falhou' },
  };
  const m = map[status] || { cls: 'fb-pill-neutral', label: status };
  return <span className={`fb-pill ${m.cls}`}><span className="fb-pill-dot" />{m.label}</span>;
}

export function TipoPill({ tipo }) {
  const map = {
    consecutivas:       { cls: 'fb-pill-warning', label: 'Consecutivas' },
    mensal:             { cls: 'fb-pill-info',    label: 'Mensal' },
    manual:             { cls: 'fb-pill-primary', label: 'Manual' },
    '5_faltas_30_dias': { cls: 'fb-pill-info',    label: '5 em 30d' },
    '3_consecutivas':   { cls: 'fb-pill-warning', label: 'Consecutivas' },
  };
  const m = map[tipo] || { cls: 'fb-pill-neutral', label: tipo };
  return <span className={`fb-pill ${m.cls}`}>{m.label}</span>;
}

export function Avatar({ initials, risk, faltas, size = 30 }) {
  const r = risk || (faltas >= 10 ? 'alto' : faltas >= 5 ? 'risco' : 'regular');
  const bg = {
    regular: 'oklch(0.94 0.04 155)',
    risco:   'oklch(0.95 0.05 70)',
    alto:    'oklch(0.94 0.05 25)',
  }[r] || 'var(--primary-soft-2)';
  const fg = {
    regular: 'oklch(0.4 0.13 155)',
    risco:   'oklch(0.45 0.14 55)',
    alto:    'oklch(0.45 0.18 25)',
  }[r] || 'var(--primary-text)';
  return (
    <span
      className="fb-avatar fb-num"
      style={{ background: bg, color: fg, width: size, height: size, flex: `0 0 ${size}px` }}
    >
      {initials}
    </span>
  );
}

export function Sparkline({ data = [], color = 'var(--primary)', width = 90, height = 28 }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const step = width / (data.length - 1 || 1);
  const pts = data.map((v, i) => [i * step, height - (v / max) * (height - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={area} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function initials(name = '') {
  return name.split(' ').filter(p => p.length > 2).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

export function riskKey(faltas) {
  return faltas >= 10 ? 'alto' : faltas >= 5 ? 'risco' : 'regular';
}

export function riskColor(risk) {
  return {
    alto:    'var(--danger)',
    risco:   'var(--warning)',
    regular: 'var(--success)',
  }[risk] || 'var(--success)';
}

export function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="fb-row-between" style={{ padding: '14px 0', borderTop: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        {desc && <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 38, height: 22, borderRadius: 999, border: 0, padding: 2,
          background: value ? 'var(--primary)' : 'var(--border-strong)',
          transition: 'background .12s', cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'block', width: 18, height: 18, borderRadius: 999, background: 'white',
          transform: value ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform .15s',
          boxShadow: '0 1px 2px oklch(0 0 0 / 0.2)',
        }} />
      </button>
    </div>
  );
}
