import { useState } from 'react';
import * as I from '../components/icons.jsx';

const SECTIONS = [
  ['primeiros-passos', 'Primeiros Passos', <I.Arrow />],
  ['guias',            'Guias',            <I.BookOpen />],
  ['faq',              'Perguntas Frequentes', <I.HelpCircle />],
];

function Step({ n, title, desc, tip }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--primary)', color: '#fff',
        display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: 13, flex: '0 0 32px',
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{desc}</div>
        {tip && (
          <div style={{ marginTop: 8, padding: '7px 12px', background: 'var(--primary-soft)', color: 'var(--primary-text)', borderRadius: 7, fontSize: 12.5 }}>
            <strong>Dica:</strong> {tip}
          </div>
        )}
      </div>
    </div>
  );
}

function GuideCard({ icon, title, children }) {
  return (
    <div className="fb-card" style={{ marginBottom: 14 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: 'var(--primary)' }}>{icon}</div>
        <div style={{ fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ padding: '4px 20px 16px' }}>{children}</div>
    </div>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontWeight: 500, fontSize: 14, color: 'var(--text-1)',
        }}
      >
        <span>{question}</span>
        <span style={{ color: 'var(--text-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flex: '0 0 16px' }}>
          <I.Chevron size={16} />
        </span>
      </button>
      {open && (
        <div className="fb-muted" style={{ fontSize: 13.5, lineHeight: 1.6, paddingBottom: 14 }}>
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Ajuda() {
  const [active, setActive] = useState('primeiros-passos');

  return (
    <div className="fb-main">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Ajuda</h1>
          <div className="fb-page-sub">Tutoriais, guias e respostas para as dúvidas mais comuns.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 20, height: 'fit-content' }}>
          {SECTIONS.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 12px', borderRadius: 8,
                border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 500,
                background: active === key ? 'var(--primary-soft)' : 'transparent',
                color: active === key ? 'var(--primary-text)' : 'var(--text-2)',
                transition: 'background .12s, color .12s',
              }}
            >
              {icon}<span>{label}</span>
            </button>
          ))}
        </nav>

        <div>
          {active === 'primeiros-passos' && (
            <div className="fb-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600 }}>Como começar a usar o Faltas Bot</div>
                <div className="fb-muted" style={{ fontSize: 12.5, marginTop: 2 }}>Siga os passos abaixo na ordem para configurar o sistema do zero.</div>
              </div>
              <div style={{ padding: '0 20px' }}>
                <Step
                  n={1}
                  title="Importar os dados de frequência"
                  desc="Acesse a página Importar PDF no menu lateral. Clique em Selecionar arquivo, escolha o PDF de frequência gerado pela secretaria e aguarde o processamento. Os alunos e registros de faltas serão carregados automaticamente."
                  tip="O PDF deve ser no formato padrão da secretaria. Se a importação falhar, verifique se o arquivo não está corrompido ou protegido por senha."
                />
                <Step
                  n={2}
                  title="Conectar o WhatsApp"
                  desc="Acesse Alertas no menu lateral e clique no botão Conectar WhatsApp. Um QR code será exibido na tela. Abra o WhatsApp no celular, vá em Dispositivos conectados → Conectar dispositivo, e escaneie o código."
                  tip="Mantenha o celular com internet e o WhatsApp aberto. A sessão fica salva — você só precisará escanear novamente se sair ou trocar de celular."
                />
                <Step
                  n={3}
                  title="Configurar os limiares de alerta"
                  desc="Acesse Configurações → Limiares de alerta. Defina quantas faltas consecutivas e quantas faltas em 30 dias disparam o envio de mensagem para os responsáveis. Os valores padrão são 3 consecutivas e 5 mensais."
                />
                <Step
                  n={4}
                  title="Verificar e enviar alertas"
                  desc="Acesse Alertas para ver a lista de alunos que atingiram os limiares configurados. Você pode enviar alertas individualmente clicando no botão de envio de cada linha, ou usar o envio em lote para selecionar múltiplos alunos de uma vez."
                  tip="Se o envio automático estiver ativo em Configurações → Regras de envio, os alertas são disparados assim que o limiar é atingido."
                />
                <Step
                  n={5}
                  title="Acompanhar os alunos"
                  desc="Na página Alunos, você encontra a lista completa de alunos importados. Clique em qualquer aluno para ver o histórico detalhado de faltas, os alertas já enviados e as informações de contato do responsável."
                />
              </div>
            </div>
          )}

          {active === 'guias' && (
            <>
              <GuideCard icon={<I.Bell size={16} />} title="Guia de Alertas">
                <div style={{ paddingTop: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Tipos de alerta</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    O sistema monitora dois tipos de ausência: <strong>faltas consecutivas</strong> (dias seguidos sem aparecer dentro de 3 dias úteis) e <strong>faltas mensais</strong> (total de faltas injustificadas nos últimos 30 dias). Cada tipo tem seu próprio limiar configurável.
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Envio manual</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    Na lista de alertas, clique no ícone de envio ao lado do aluno para disparar a mensagem imediatamente, independente do limiar.
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Envio em lote</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                    Marque a caixa de seleção de múltiplos alunos e use o botão Enviar selecionados para disparar mensagens para todos de uma vez. Útil no início do período letivo.
                  </div>
                </div>
              </GuideCard>

              <GuideCard icon={<I.Users size={16} />} title="Guia de Alunos">
                <div style={{ paddingTop: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Busca e filtros</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    Use a barra de busca no topo da página Alunos para localizar por nome ou turma. O filtro de status permite ver apenas alunos com alertas ativos, sem alertas, ou todos.
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Histórico individual</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    Clique no nome do aluno para abrir a tela de detalhes. Lá você encontra o calendário de faltas, as mensagens já enviadas ao responsável e os dados de contato.
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Status de faltas</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                    O badge colorido ao lado do nome indica o risco: <span className="fb-pill fb-pill-success" style={{ display: 'inline-flex', fontSize: 11 }}>Normal</span> abaixo do limiar, <span className="fb-pill fb-pill-warning" style={{ display: 'inline-flex', fontSize: 11 }}>Atenção</span> próximo, <span className="fb-pill" style={{ display: 'inline-flex', fontSize: 11, background: 'var(--danger-soft)', color: 'var(--danger)' }}>Crítico</span> acima do limiar.
                  </div>
                </div>
              </GuideCard>

              <GuideCard icon={<I.Inbox size={16} />} title="Guia de Mensagens e Templates">
                <div style={{ paddingTop: 12 }}>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    Em Configurações → Templates, você pode personalizar o texto enviado para cada tipo de alerta. Use as variáveis abaixo que serão substituídas automaticamente:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {[
                      ['{responsavel}', 'Nome do responsável cadastrado'],
                      ['{aluno}',       'Nome completo do aluno'],
                      ['{faltas}',      'Número de faltas que disparou o alerta'],
                    ].map(([v, d]) => (
                      <div key={v} className="fb-row" style={{ gap: 12 }}>
                        <span className="fb-kbd">{v}</span>
                        <span className="fb-muted" style={{ fontSize: 13 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                    O campo Preview em tempo real mostra como a mensagem ficará com dados reais antes de salvar.
                  </div>
                </div>
              </GuideCard>

              <GuideCard icon={<I.Upload size={16} />} title="Guia de Importação de PDF">
                <div style={{ paddingTop: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Formato aceito</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    O sistema aceita PDFs no formato padrão de frequência emitido pela secretaria escolar. Arquivos de outras fontes ou layouts diferentes podem não ser reconhecidos corretamente.
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Dados duplicados</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    Reimportar um arquivo já importado atualiza os registros existentes sem criar duplicatas — o sistema identifica alunos pelo nome e turma.
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Frequência de atualização</div>
                  <div className="fb-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                    Importe um novo PDF sempre que receber o relatório atualizado da secretaria. Não há sincronização automática.
                  </div>
                </div>
              </GuideCard>
            </>
          )}

          {active === 'faq' && (
            <div className="fb-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600 }}>Perguntas Frequentes</div>
              </div>
              <div style={{ padding: '0 20px' }}>
                <FaqItem
                  question="O WhatsApp desconecta com frequência. O que fazer?"
                  answer="Mantenha o celular com bateria e conectado à internet. Não saia da conta do WhatsApp nem remova o dispositivo conectado. Se a sessão expirar, acesse Alertas e escaneie o QR code novamente — isso leva menos de 1 minuto."
                />
                <FaqItem
                  question="O PDF não importa corretamente. Como resolver?"
                  answer="Verifique se o arquivo é o relatório de frequência padrão emitido pela secretaria. PDFs escaneados (imagem) não funcionam — o arquivo precisa ter texto selecionável. Também certifique-se de que o arquivo não está protegido por senha."
                />
                <FaqItem
                  question="Os alertas não estão sendo enviados automaticamente."
                  answer="Acesse Configurações → Regras de envio e verifique se Envio automático está ativo. Também confira se o WhatsApp está conectado (indicador verde no menu lateral). Sem conexão ativa, nenhum envio é feito."
                />
                <FaqItem
                  question="A mensagem chegou para o responsável errado."
                  answer="O responsável é cadastrado junto com os dados do aluno no PDF importado. Se os dados estiverem errados, corrija no arquivo fonte e reimporte o PDF. O sistema atualizará os dados automaticamente."
                />
                <FaqItem
                  question="Como redefinir ou apagar todos os dados?"
                  answer="Não há função de reset pelo sistema por segurança. Para apagar registros, entre em contato com o administrador do sistema que pode limpar o banco de dados diretamente."
                />
                <FaqItem
                  question="Posso usar o sistema em mais de um computador?"
                  answer="Sim, desde que apontem para o mesmo servidor. O WhatsApp, porém, aceita apenas uma sessão ativa por vez — se outra sessão for iniciada, a anterior é encerrada."
                />
                <FaqItem
                  question="Como saber se um alerta já foi enviado?"
                  answer="Na página Alertas, alertas já enviados exibem a data e hora do último envio na coluna correspondente. No detalhe do aluno (Alunos → clicar no nome), você vê o histórico completo de mensagens enviadas."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
