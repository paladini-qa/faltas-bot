import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTipoAlerta(tipo) {
  if (!tipo) return { label: '—', className: 'bg-slate-100 text-slate-600' };
  if (tipo.includes('30') || tipo.includes('5_faltas')) {
    return { label: '5 em 30d', className: 'bg-blue-100 text-blue-700' };
  }
  if (tipo.includes('consec')) {
    return { label: '3 consecutivas', className: 'bg-orange-100 text-orange-700' };
  }
  if (tipo === 'manual') {
    return { label: 'Manual', className: 'bg-purple-100 text-purple-700' };
  }
  return { label: tipo, className: 'bg-slate-100 text-slate-600' };
}

const STATUS_CONFIG = {
  conectado: {
    cardCls: 'bg-green-50 border border-green-200',
    dotCls: 'bg-green-500',
    textCls: 'text-green-700',
    text: 'WhatsApp conectado',
  },
  aguardando_qr: {
    cardCls: 'bg-yellow-50 border border-yellow-200',
    dotCls: 'bg-yellow-500',
    textCls: 'text-yellow-700',
    text: 'Aguardando QR code',
  },
  desconectado: {
    cardCls: 'bg-red-50 border border-red-200',
    dotCls: 'bg-red-500',
    textCls: 'text-red-700',
    text: 'WhatsApp desconectado',
  },
};

export default function Alertas() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, alertaId: null });
  const { toasts, toast } = useToast();

  useEffect(() => {
    api.alertas(100)
      .then(data => { setAlertas(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    function pollStatus() {
      api.whatsappStatus()
        .then(data => {
          setStatus(data.status);
          setQrDataUrl(data.qr || null);
        })
        .catch(() => setStatus('desconectado'));
    }

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleEnviar() {
    setEnviando(true);
    setResultado(null);
    try {
      const data = await api.enviarAlertas();
      setResultado({ ok: true, total: data.total, enviados: data.enviados });
      const updated = await api.alertas(100);
      setAlertas(updated);
    } catch (e) {
      setResultado({ ok: false, msg: e.message });
    } finally {
      setEnviando(false);
    }
  }

  async function confirmDeleteAlerta() {
    await api.deleteAlerta(confirmState.alertaId);
    setAlertas(prev => prev.filter(x => x.id !== confirmState.alertaId));
    toast.success('Alerta excluído');
    setConfirmState({ open: false, alertaId: null });
  }

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.desconectado;

  return (
    <>
    <ConfirmModal
      open={confirmState.open}
      message="Excluir este registro de alerta?"
      onConfirm={confirmDeleteAlerta}
      onCancel={() => setConfirmState({ open: false, alertaId: null })}
    />
    <Toast toasts={toasts} />
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Alertas Enviados</h1>

      {/* WhatsApp status bar */}
      {status && (
        <div className={`${statusCfg.cardCls} rounded-xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center">
            <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dotCls} inline-block mr-2`} />
            <span className={`${statusCfg.textCls} font-medium text-sm`}>{statusCfg.text}</span>
          </div>
          <button
            onClick={handleEnviar}
            disabled={enviando || status !== 'conectado'}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? 'Verificando...' : 'Verificar e Enviar Alertas'}
          </button>
        </div>
      )}

      {/* QR code panel */}
      {status === 'aguardando_qr' && (
        <div className="flex flex-col items-center gap-3 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm font-medium text-yellow-800">
            Escaneie o QR code com o WhatsApp para conectar
          </p>
          {qrDataUrl
            ? <img src={qrDataUrl} alt="QR Code WhatsApp" className="w-48 h-48" />
            : <p className="text-xs text-yellow-600">Gerando QR code...</p>
          }
          <p className="text-xs text-yellow-600">O código é atualizado automaticamente a cada 5 segundos</p>
        </div>
      )}

      {/* Result feedback */}
      {resultado && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          resultado.ok
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {resultado.ok
            ? resultado.total === 0
              ? 'Nenhum novo alerta para enviar.'
              : `${resultado.total} alerta(s) enviado(s): ${resultado.enviados.map(e => `${e.aluno} (${e.tipo})`).join(', ')}.`
            : `Erro: ${resultado.msg}`}
        </div>
      )}

      {/* Alerts table */}
      {alertas.length === 0 ? (
        <p className="text-gray-500">Nenhum alerta enviado ainda.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Turma</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Enviado em</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alertas.map(a => {
                const badge = formatTipoAlerta(a.tipo_alerta);
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/alunos/${a.aluno_id}`} className="text-indigo-600 hover:underline font-medium">
                        {a.aluno_nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.turma || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(a.enviado_em)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmState({ open: true, alertaId: a.id })}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">{alertas.length} alerta{alertas.length !== 1 ? 's' : ''}</p>
    </div>
    </>
  );
}
