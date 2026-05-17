import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Upload() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.pdf')) {
      setError('Apenas arquivos PDF são aceitos.');
      return;
    }
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const data = await api.upload(file);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Importar PDF</h1>
      <p className="text-sm text-gray-500">
        Faça upload do relatório de frequência exportado pelo sistema escolar.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors
          ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">Processando PDF...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">📄</span>
            <p className="text-gray-600 font-medium">Arraste o PDF aqui ou clique para selecionar</p>
            <p className="text-gray-400 text-sm">Arquivos PDF até 20 MB</p>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium mt-2"
            >
              Selecionar arquivo
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-2">
          <p className="font-semibold text-green-800">Importação concluída!</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-green-900">
            <dt className="font-medium">Disciplina</dt>
            <dd>{result.disciplina || '—'}</dd>
            <dt className="font-medium">Ano letivo</dt>
            <dd>{result.ano}</dd>
            <dt className="font-medium">Turma</dt>
            <dd>{result.meta?.turma || '—'}</dd>
            <dt className="font-medium">Série</dt>
            <dd>{result.meta?.serie || '—'}</dd>
            <dt className="font-medium">Aulas no PDF</dt>
            <dd>{result.datasAula?.length ?? 0}</dd>
            <dt className="font-medium">Alunos</dt>
            <dd>{result.totalAlunos} ({result.novosAlunos} novos)</dd>
            <dt className="font-medium">Faltas salvas</dt>
            <dd>{result.novasFaltas}</dd>
          </dl>
          <div className="pt-2">
            <Link to="/alunos" className="text-sm text-indigo-600 font-semibold hover:underline">
              Ver alunos afetados →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
