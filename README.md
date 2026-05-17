# Faltas Bot

Dashboard web para monitoramento de faltas escolares e envio automático de alertas via WhatsApp para os responsáveis dos alunos.

## Visão Geral

A secretaria importa o relatório diário de faltas em PDF, gerencia os responsáveis dos alunos pelo dashboard, e o bot avalia as regras de alerta e envia mensagens pelo WhatsApp automaticamente.

## Stack

| Camada      | Tecnologia                        |
| ----------- | --------------------------------- |
| Frontend    | React 18 + Vite + Tailwind CSS    |
| Backend     | Node.js + Express (porta 3001)    |
| Banco       | PostgreSQL                        |
| WhatsApp    | `whatsapp-web.js`                 |
| PDF parsing | `pdf-parse`                       |

## Pré-requisitos

- Node.js >= 18
- PostgreSQL rodando localmente (ou via URL remota)
- Um número de WhatsApp ativo no celular

## Instalação

```bash
git clone <url-do-repositorio>
cd faltas-bot
npm install
npm --prefix client install
```

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/faltas_bot
```

## Rodando o projeto

```bash
npm run dev
```

Isso inicia o servidor Express (porta 3001) e o cliente Vite (porta 5173) em paralelo.

## Telas do Dashboard

| Rota             | Descrição                                               |
| ---------------- | ------------------------------------------------------- |
| `/`              | Dashboard com totais e lista de alunos em risco         |
| `/alunos`        | Listagem com filtros por nome, turma, série e risco     |
| `/alunos/:id`    | Detalhe do aluno: responsáveis + faltas por disciplina  |
| `/upload`        | Importação de relatório PDF de faltas                   |
| `/alertas`       | Status do WhatsApp, envio de alertas e histórico        |
| `/mensagens`     | Templates de mensagens enviadas                         |
| `/configuracoes` | Configurações gerais do sistema                         |

## Regras de Alerta

| Regra               | Critério                            |
| ------------------- | ----------------------------------- |
| Faltas consecutivas | 3 faltas em dias letivos seguidos   |
| Faltas no período   | 5 faltas injustificadas em 30 dias  |

Cada tipo de alerta é disparado **uma única vez por período** por aluno, sem repetição. O histórico de envios fica registrado na tabela `alertas_enviados`.

### Templates de Mensagem

**3 faltas consecutivas:**
> Olá [RESPONSÁVEL]! Tudo bem? Notamos que [TUTELADO] possui 3 faltas consecutivas. Entramos em contato para entendermos o motivo e como podemos ajudar.

**5 faltas em 30 dias:**
> Olá [RESPONSÁVEL]! Tudo bem? Notamos que [TUTELADO] possui 5 faltas no período de 1 mês. Entramos em contato para entendermos o motivo e como podemos ajudar.

## Níveis de Risco

| Nível      | Critério                  | Cor     |
| ---------- | ------------------------- | ------- |
| Alto risco | ≥ 10 faltas injustificadas | Vermelho |
| Em risco   | ≥ 5 faltas injustificadas  | Laranja  |
| Regular    | < 5 faltas                | Verde   |

## Esquema do Banco de Dados (PostgreSQL)

```sql
CREATE TABLE alunos (
  id        SERIAL PRIMARY KEY,
  nome      TEXT    NOT NULL,
  numero    INTEGER,
  turma     TEXT    NOT NULL DEFAULT '',
  serie     TEXT    NOT NULL DEFAULT '',
  curso     TEXT    NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nome, turma, serie, curso)
);

CREATE TABLE responsaveis (
  id        SERIAL PRIMARY KEY,
  aluno_id  INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  nome      TEXT    NOT NULL,
  telefone  TEXT    NOT NULL
);

CREATE TABLE faltas (
  id          SERIAL PRIMARY KEY,
  aluno_id    INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  data        DATE    NOT NULL,
  disciplina  TEXT    NOT NULL DEFAULT '',
  justificada BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(aluno_id, data, disciplina)
);

CREATE TABLE alertas_enviados (
  id          SERIAL PRIMARY KEY,
  aluno_id    INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  tipo_alerta TEXT    NOT NULL,  -- 'consecutivas' | 'mensal'
  enviado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
```

O schema é criado automaticamente ao iniciar o servidor (`initSchema` em `src/db.js`).

## Estrutura de Pastas

```
faltas-bot/
├── client/                   # Frontend React + Vite
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Alunos.jsx
│       │   ├── AlunoDetalhe.jsx
│       │   ├── Upload.jsx
│       │   ├── Alertas.jsx
│       │   ├── Mensagens.jsx
│       │   └── Configuracoes.jsx
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Badge.jsx
│       │   ├── Toast.jsx
│       │   ├── ConfirmModal.jsx
│       │   └── SkeletonRow.jsx
│       ├── hooks/
│       │   └── useToast.js
│       └── api.js            # Funções de chamada à API REST
├── server/
│   ├── index.js              # Entry point do Express
│   └── routes/
│       ├── dashboard.js
│       ├── alunos.js
│       ├── responsaveis.js
│       ├── upload.js
│       ├── faltas.js
│       ├── alertas.js
│       ├── mensagens.js
│       └── configuracoes.js
├── src/
│   ├── db.js                 # Pool PostgreSQL e queries
│   ├── importar.js           # Parsing do PDF
│   ├── alertas.js            # Lógica das regras de alerta
│   └── whatsapp.js           # Cliente whatsapp-web.js
├── docs/
│   └── requirements.md       # Requisitos funcionais e não-funcionais
├── .env                      # Variáveis de ambiente (não commitado)
├── index.js                  # CLI legado (importação via terminal)
└── package.json
```

## WhatsApp

Na primeira vez que acessar a tela de Alertas, um QR Code será exibido na interface. Escaneie com o WhatsApp do celular para autenticar a sessão. A sessão é salva localmente e não precisa ser refeita nas execuções seguintes.

A barra de status no topo da tela de Alertas indica o estado da conexão em tempo real (conectado / aguardando QR / desconectado).
