import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

function formatDate() {
  const raw = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function SkeletonCard() {
  return <div className="bg-slate-200 animate-pulse rounded-xl h-24" />;
}

function StatCard({ label, value, valueColor, to }) {
  const inner = (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={`text-3xl font-bold ${valueColor}`}>{value ?? '—'}</span>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const { toasts, toast } = useToast();

  useEffect(() => {
    api.dashboard()
      .then(setStats)
      .catch(e => {
        setError(e.message);
        toast.error(e.message);
      });
  }, []);

  if (error) return <p className="text-red-600 p-6">{error}</p>;

  const hasRisk = stats?.alunos_em_risco > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 1. Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDate()}</p>
        </div>
        <Link
          to="/upload"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Importar PDF
        </Link>
      </div>

      {/* 2. Priority banner */}
      {hasRisk && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-semibold text-red-800 text-sm">
              Ação necessária — {stats.alunos_em_risco} aluno(s) em risco de reprovação
            </span>
          </div>

          <div className="space-y-2">
            {(stats.top_risco || []).map((aluno) => {
              const isHighRisk = aluno.faltas_injustificadas >= 10;
              return (
                <Link
                  key={aluno.id}
                  to={`/alunos/${aluno.id}`}
                  className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-4 py-2.5 hover:border-red-300 transition-colors"
                >
                  <div>
                    <span className="font-medium text-slate-900 text-sm">{aluno.nome}</span>
                    <span className="text-slate-500 text-xs ml-2">{aluno.turma} · {aluno.serie}</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isHighRisk
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {isHighRisk ? '🔴' : '🟠'} {aluno.faltas_injustificadas} faltas
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            to="/alunos?risco=alto"
            className="inline-block text-sm text-red-700 hover:text-red-900 font-medium"
          >
            Ver todos os {stats.alunos_em_risco} alunos em risco →
          </Link>
        </div>
      )}

      {/* 3. Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats === null ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Total de Alunos"
              value={stats.total_alunos}
              valueColor="text-slate-900"
              to="/alunos"
            />
            <StatCard
              label="Faltas Injustificadas"
              value={stats.total_faltas}
              valueColor="text-orange-600"
            />
            <StatCard
              label="Alunos em Risco"
              value={stats.alunos_em_risco}
              valueColor="text-red-600"
              to="/alunos?risco=alto"
            />
            <StatCard
              label="Alertas Enviados"
              value={stats.total_alertas}
              valueColor="text-emerald-600"
              to="/alertas"
            />
          </>
        )}
      </div>

      {/* 4. Quick actions */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Ações rápidas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/upload"
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <span className="text-xl">📄</span>
            <div>
              <p className="text-sm font-medium text-slate-900">Importar novo PDF</p>
              <p className="text-xs text-slate-500">Atualizar frequência</p>
            </div>
          </Link>

          <Link
            to="/alertas"
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-sm font-medium text-slate-900">Enviar alertas</p>
              <p className="text-xs text-slate-500">Notificar responsáveis</p>
            </div>
          </Link>

          <Link
            to="/alunos"
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <span className="text-xl">👥</span>
            <div>
              <p className="text-sm font-medium text-slate-900">Ver todos os alunos</p>
              <p className="text-xs text-slate-500">Buscar e filtrar</p>
            </div>
          </Link>
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  );
}
