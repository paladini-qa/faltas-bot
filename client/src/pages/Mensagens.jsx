import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

export default function Mensagens() {
  const [modo, setModo] = useState('aluno');

  // Aluno mode
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [telefonesSelecionados, setTelefonesSelecionados] = useState([]);

  // Turma mode
  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [alunosDaTurma, setAlunosDaTurma] = useState([]);

  // Shared
  const [mensagem, setMensagem] = useState('');
  const [templates, setTemplates] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [waStatus, setWaStatus] = useState(null);

  const { toasts, toast } = useToast();
  const debounceRef = useRef(null);

  // On mount: load filtros, configuracoes, whatsappStatus
  useEffect(() => {
    api.filtros().then(d => setTurmas(d.turmas || [])).catch(() => {});
    api.configuracoes().then(d => setTemplates(d)).catch(() => {});
    api.whatsappStatus().then(d => setWaStatus(d.status)).catch(() => {});
  }, []);

  // Debounced aluno search
  useEffect(() => {
    if (alunoSelecionado) return;
    if (query.length < 2) { setResultados([]); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBuscando(true);
      api.alunos({ q: query })
        .then(data => setResultados(data))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, alunoSelecionado]);

  // Load alunos when turma changes
  useEffect(() => {
    if (!turmaSelecionada) { setAlunosDaTurma([]); return; }
    api.alunos({ turma: turmaSelecionada })
      .then(data => setAlunosDaTurma(data))
      .catch(() => setAlunosDaTurma([]));
  }, [turmaSelecionada]);

  async function handleSelecionarAluno(a) {
    try {
      const full = await api.aluno(a.id);
      setAlunoSelecionado(full);
      setTelefonesSelecionados(full.responsaveis.map(r => r.telefone));
      setResultados([]);
      setQuery('');
    } catch (e) {
      toast.error('Erro ao carregar aluno: ' + e.message);
    }
  }

  async function handleEnviar() {
    setEnviando(true);
    try {
      let data;
      if (modo === 'aluno') {
        data = { alunoId: alunoSelecionado.id, mensagemTemplate: mensagem, telefonesSelecionados };
      } else {
        data = { turma: turmaSelecionada, mensagemTemplate: mensagem };
      }
      const result = await api.enviarMensagemManual(data);
      toast.success(`${result.enviados} mensagem(ns) enviada(s) com sucesso`);
      if (result.erros?.length > 0) {
        toast.error(`${result.erros.length} erro(s): ${result.erros[0]}`);
      }
      // Reset form
      setAlunoSelecionado(null);
      setTelefonesSelecionados([]);
      setQuery('');
      setTurmaSelecionada('');
      setAlunosDaTurma([]);
      setMensagem('');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const podeEnviar =
    waStatus === 'conectado' &&
    mensagem.trim() &&
    !enviando &&
    (modo === 'aluno'
      ? alunoSelecionado && telefonesSelecionados.length > 0
      : turmaSelecionada !== '');

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mensagem Manual</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Envie uma mensagem WhatsApp para responsáveis de um aluno ou de uma turma inteira
        </p>
      </div>

      {/* WhatsApp status warning */}
      {waStatus !== 'conectado' && waStatus !== null && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            WhatsApp desconectado —{' '}
            <a href="/alertas" className="underline font-medium">
              acesse Alertas para conectar
            </a>
          </span>
        </div>
      )}

      {/* Step 1 — Destinatário */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            1
          </span>
          <span className="text-sm font-semibold text-slate-900">Destinatário</span>
        </div>

        <div className="p-4">
          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1 w-fit mb-4">
            {['aluno', 'turma'].map(m => (
              <button
                key={m}
                onClick={() => {
                  setModo(m);
                  setAlunoSelecionado(null);
                  setTurmaSelecionada('');
                  setMensagem('');
                }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  modo === m
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'aluno' ? '👤 Aluno específico' : '👥 Turma inteira'}
              </button>
            ))}
          </div>

          {/* Aluno mode */}
          {modo === 'aluno' && (
            <>
              <div className="relative">
                <input
                  type="search"
                  placeholder="Digite o nome do aluno..."
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setAlunoSelecionado(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {buscando && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    Buscando...
                  </span>
                )}
                {resultados.length > 0 && !alunoSelecionado && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {resultados.slice(0, 8).map(a => (
                      <button
                        key={a.id}
                        onClick={() => handleSelecionarAluno(a)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <span className="font-medium text-slate-900">{a.nome}</span>
                        <span className="text-slate-500 ml-2">
                          {a.turma} · {a.serie}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected aluno card */}
              {alunoSelecionado && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">
                        {alunoSelecionado.nome}
                      </span>
                      <span className="text-slate-500 text-xs ml-2">
                        {alunoSelecionado.turma} · {alunoSelecionado.serie}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setAlunoSelecionado(null);
                        setTelefonesSelecionados([]);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕ Alterar
                    </button>
                  </div>
                  {alunoSelecionado.responsaveis.length === 0 ? (
                    <p className="text-xs text-red-600">Nenhum responsável cadastrado</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Responsáveis
                      </p>
                      {alunoSelecionado.responsaveis.map(r => (
                        <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={telefonesSelecionados.includes(r.telefone)}
                            onChange={e =>
                              setTelefonesSelecionados(prev =>
                                e.target.checked
                                  ? [...prev, r.telefone]
                                  : prev.filter(t => t !== r.telefone)
                              )
                            }
                            className="accent-indigo-600"
                          />
                          <span className="text-slate-900">{r.nome}</span>
                          <span className="text-slate-400 text-xs">{r.telefone}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Turma mode */}
          {modo === 'turma' && (
            <>
              <select
                value={turmaSelecionada}
                onChange={e => setTurmaSelecionada(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Selecione uma turma...</option>
                {turmas.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {turmaSelecionada && (
                <p className="text-xs text-slate-500 mt-2">
                  {alunosDaTurma.reduce((s, a) => s + a.total_responsaveis, 0)} responsáveis em{' '}
                  {alunosDaTurma.length} alunos da {turmaSelecionada}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Step 2 — Mensagem */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            2
          </span>
          <span className="text-sm font-semibold text-slate-900">Mensagem</span>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs font-semibold text-slate-500">Carregar template:</label>
            <select
              onChange={e => {
                if (e.target.value === 'consecutivas')
                  setMensagem(templates?.template_consecutivas || '');
                else if (e.target.value === 'mensal')
                  setMensagem(templates?.template_mensal || '');
                else setMensagem('');
                e.target.value = '';
              }}
              defaultValue=""
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:outline-none"
            >
              <option value="" disabled>
                Escolher template...
              </option>
              <option value="consecutivas">3 consecutivas</option>
              <option value="mensal">5 em 30 dias</option>
              <option value="blank">Mensagem em branco</option>
            </select>
          </div>

          <textarea
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            placeholder="Digite a mensagem ou carregue um template acima..."
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <p className="text-xs text-slate-400 mt-1">
            As variáveis{' '}
            <code className="bg-slate-100 px-1 rounded">{'{responsavel}'}</code>,{' '}
            <code className="bg-slate-100 px-1 rounded">{'{aluno}'}</code> e{' '}
            <code className="bg-slate-100 px-1 rounded">{'{faltas}'}</code> serão substituídas
            individualmente para cada responsável no momento do envio.
          </p>
        </div>
      </div>

      {/* Step 3 — Confirmar envio */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            3
          </span>
          <span className="text-sm font-semibold text-slate-900">Confirmar envio</span>
        </div>

        <div className="p-4">
          {podeEnviar && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800 mb-3">
              {modo === 'aluno'
                ? `${telefonesSelecionados.length} mensagem(ns) serão enviadas para os responsáveis de ${alunoSelecionado?.nome}`
                : `${alunosDaTurma.reduce((s, a) => s + a.total_responsaveis, 0)} mensagens serão enviadas para os responsáveis da ${turmaSelecionada}`}
            </div>
          )}
          <button
            onClick={handleEnviar}
            disabled={!podeEnviar}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {enviando ? 'Enviando...' : '📨 Enviar mensagens agora'}
          </button>
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  );
}
