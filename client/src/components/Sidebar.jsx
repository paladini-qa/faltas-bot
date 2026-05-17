import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api.js';

const links = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/alunos', label: 'Alunos', icon: '👥' },
  { to: '/upload', label: 'Importar PDF', icon: '📄' },
  { to: '/alertas', label: 'Alertas', icon: '🔔' },
  { to: '/mensagens', label: 'Mensagens', icon: '📨' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙️' },
];

const WA_STATUS = {
  conectado: { dot: 'bg-green-500', text: 'WhatsApp conectado', color: 'text-green-400' },
  aguardando_qr: { dot: 'bg-yellow-500', text: 'Aguardando QR code', color: 'text-yellow-400' },
  desconectado: { dot: 'bg-red-500', text: 'Desconectado', color: 'text-red-400' },
};

export default function Sidebar() {
  const [waStatus, setWaStatus] = useState('desconectado');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.whatsappStatus();
        setWaStatus(data.status || 'desconectado');
      } catch {
        setWaStatus('desconectado');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const status = WA_STATUS[waStatus] || WA_STATUS.desconectado;

  return (
    <aside className="w-56 bg-slate-900 min-h-screen flex flex-col shrink-0 fixed left-0 top-0 h-full z-10">
      {/* Header */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="text-white font-bold text-lg leading-tight">Faltas Bot</div>
        <div className="text-slate-500 text-xs mt-1">Gestão de frequência</div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* WhatsApp status */}
      <div className="px-5 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
          <span className={`text-xs ${status.color}`}>{status.text}</span>
        </div>
      </div>
    </aside>
  );
}
