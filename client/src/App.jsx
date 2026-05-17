import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Alunos from './pages/Alunos.jsx';
import AlunoDetalhe from './pages/AlunoDetalhe.jsx';
import Upload from './pages/Upload.jsx';
import Alertas from './pages/Alertas.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import Mensagens from './pages/Mensagens.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto ml-56">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alunos" element={<Alunos />} />
          <Route path="/alunos/:id" element={<AlunoDetalhe />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/mensagens" element={<Mensagens />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
