import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

function ThresholdRow({ label, description, value, onChange }) {
  const n = parseInt(value) || 0;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, n - 1))}
          className="w-7 h-7 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 font-bold text-base flex items-center justify-center"
        >−</button>
        <span className="text-base font-bold text-slate-900 w-6 text-center">{n}</span>
        <button
          onClick={() => onChange(Math.min(30, n + 1))}
          className="w-7 h-7 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 font-bold text-base flex items-center justify-center"
        >+</button>
      </div>
    </div>
  );
}

function TemplateBlock({ badgeLabel, badgeClass, value, onChange, previewThreshold }) {
  const preview = (value || '')
    .replace(/{responsavel}/g, 'Maria')
    .replace(/{aluno}/g, 'João')
    .replace(/{faltas}/g, previewThreshold);

  return (
    <div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{badgeLabel}</span>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <p className="text-xs text-slate-400 mt-1">
        Preview: <span className="text-slate-600">{preview}</span>
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
        <div className="h-4 bg-slate-200 rounded w-40 mb-1" />
        <div className="h-3 bg-slate-100 rounded w-64" />
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-5/6" />
      </div>
      <div className="border-t border-slate-100 px-4 py-3 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-4/6" />
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toasts, toast } = useToast();

  const isDirty = form && config
    ? JSON.stringify(form) !== JSON.stringify(config)
    : false;

  useEffect(() => {
    api.configuracoes()
      .then(data => {
        setConfig(data);
        setForm(data);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveConfiguracoes(form);
      setConfig({ ...form });
      toast.success('Configurações salvas com sucesso');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: String(value) }));
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
            <p className="text-sm text-slate-500 mt-0.5">Limiares de alerta e templates de mensagem</p>
          </div>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>

        {/* Unsaved changes warning */}
        {isDirty && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>Você tem alterações não salvas</span>
          </div>
        )}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Section 1 — Limiares */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-900">Limiares de alerta</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Quantidade de faltas que dispara o envio automático de mensagem
                </div>
              </div>
              <ThresholdRow
                label="Faltas consecutivas"
                description="Faltas seguidas (dentro de 3 dias entre si)"
                value={form?.threshold_consecutivas}
                onChange={val => updateForm('threshold_consecutivas', val)}
              />
              <div className="border-t border-slate-100">
                <ThresholdRow
                  label="Faltas em 30 dias"
                  description="Faltas injustificadas acumuladas no último mês"
                  value={form?.threshold_mensal}
                  onChange={val => updateForm('threshold_mensal', val)}
                />
              </div>
            </div>

            {/* Section 2 — Templates */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-900 mb-1.5">Templates de mensagem</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-500">Variáveis disponíveis:</span>
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-1.5 py-0.5 rounded font-mono">{'{responsavel}'}</span>
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-1.5 py-0.5 rounded font-mono">{'{aluno}'}</span>
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-1.5 py-0.5 rounded font-mono">{'{faltas}'}</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <TemplateBlock
                  badgeLabel={`${form?.threshold_consecutivas || 3} consecutivas`}
                  badgeClass="bg-orange-100 text-orange-700"
                  value={form?.template_consecutivas}
                  onChange={val => updateForm('template_consecutivas', val)}
                  previewThreshold={form?.threshold_consecutivas || 3}
                />
              </div>
              <div className="border-t border-slate-100">
                <div className="p-4 space-y-3">
                  <TemplateBlock
                    badgeLabel={`${form?.threshold_mensal || 5} em 30 dias`}
                    badgeClass="bg-blue-100 text-blue-700"
                    value={form?.template_mensal}
                    onChange={val => updateForm('template_mensal', val)}
                    previewThreshold={form?.threshold_mensal || 5}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Toast toasts={toasts} />
    </div>
  );
}
