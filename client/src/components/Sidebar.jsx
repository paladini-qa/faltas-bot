import { NavLink } from 'react-router-dom';
import { useWhatsapp } from '../contexts/WhatsappContext.jsx';
import * as I from './icons.jsx';

const navItems = [
  { to: '/',             label: 'Dashboard',     Icon: I.Home,     end: true,  section: 'Painel' },
  { to: '/alunos',       label: 'Alunos',        Icon: I.Users,    section: 'Painel' },
  { to: '/upload',       label: 'Importar PDF',  Icon: I.FileIcon, section: 'Painel' },
  { to: '/alertas',      label: 'Alertas',       Icon: I.Bell,     badge: true, section: 'Comunicação' },
  { to: '/mensagens',    label: 'Mensagens',     Icon: I.Inbox,    section: 'Comunicação' },
  { to: '/configuracoes',label: 'Configurações', Icon: I.Cog,      section: 'Sistema' },
];

const sections = ['Painel', 'Comunicação', 'Sistema'];

const WA_MAP = {
  conectado:    { dot: 'var(--success)', text: 'WhatsApp conectado' },
  aguardando_qr:{ dot: 'var(--warning)', text: 'Aguardando QR code' },
  desconectado: { dot: 'var(--danger)',  text: 'Desconectado' },
};

export default function Sidebar({ alertCount = 0 }) {
  const { waStatus } = useWhatsapp();

  const wa = WA_MAP[waStatus] || WA_MAP.desconectado;

  return (
    <aside className="fb-sb">
      <div className="fb-sb-brand">
        <div className="fb-sb-logo">FB</div>
        <div>
          <div className="fb-sb-name">Faltas Bot</div>
          <div className="fb-sb-sub">Gestão de frequência</div>
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec}>
          <div className="fb-sb-section">{sec}</div>
          {navItems.filter(it => it.section === sec).map(({ to, label, Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => 'fb-sb-link' + (isActive ? ' active' : '')}
            >
              <Icon />
              <span>{label}</span>
              {badge && alertCount > 0 && <span className="fb-sb-badge">{alertCount}</span>}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="fb-sb-spacer" />

      <div className="fb-sb-status">
        <span className="fb-sb-status-dot" style={{ background: wa.dot }} />
        <span>{wa.text}</span>
      </div>
    </aside>
  );
}
