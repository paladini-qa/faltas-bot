# Faltas Bot

Bot em Node.js para monitoramento automático de faltas de alunos e envio de alertas via WhatsApp para os responsáveis.

## Visão Geral

O Faltas Bot automatiza o fluxo de comunicação entre a escola e as famílias quando um aluno acumula faltas. O usuário importa o relatório diário em PDF, cadastra os responsáveis dos alunos novos, e o bot avalia as regras de alerta e envia mensagens pelo WhatsApp automaticamente.

## Stack Tecnológica

| Camada        | Tecnologia          |
| ------------- | ------------------- |
| Runtime       | Node.js >= 18       |
| PDF parsing   | `pdf-parse`         |
| WhatsApp      | `whatsapp-web.js`   |
| Banco de dados | SQLite via `better-sqlite3` |
| Interface     | CLI interativo      |

## Fluxo de Trabalho

### Etapa 1 — Importação diária de faltas (PDF)

O usuário indica o caminho do PDF gerado pelo sistema escolar. O bot extrai os dados dos alunos e os registros de faltas do documento. Alunos novos são inseridos no banco de dados; faltas são acumuladas ao histórico existente.

```bash
node index.js importar --pdf ./relatorio-2025-05-14.pdf
```

### Etapa 2 — Cadastro de responsáveis

Após a importação, o bot lista os alunos que ainda não possuem responsável vinculado. O usuário é solicitado a informar nome e telefone do responsável de cada um via CLI. Responsáveis já cadastrados são mantidos e reutilizados automaticamente nas importações futuras.

```bash
node index.js responsaveis
```

### Etapa 3 — Disparo de alertas via WhatsApp

O bot avalia as regras de alerta para todos os alunos e envia mensagens para os responsáveis cujos alunos atingiram os critérios. Um log de envios é mantido no banco para evitar mensagens duplicadas.

```bash
node index.js alertar
```

## Regras de Alerta

| Regra                | Critério                        |
| -------------------- | ------------------------------- |
| Faltas consecutivas  | 3 faltas em dias letivos seguidos |
| Faltas no período    | 5 faltas dentro de 30 dias      |

### Templates de Mensagem

**Faltas consecutivas (3 dias):**
> Olá [RESPONSÁVEL]! Tudo bem? Notamos que [TUTELADO] possui 3 faltas consecutivas. Entramos em contato para entendermos o motivo e como podemos ajudar.

**Faltas no mês (5 em 30 dias):**
> Olá [RESPONSÁVEL]! Tudo bem? Notamos que [TUTELADO] possui 5 faltas no período de 1 mês. Entramos em contato para entendermos o motivo e como podemos ajudar.

- Cada tipo de alerta é disparado **uma única vez por período**, sem mensagens repetidas.
- As regras são avaliadas automaticamente a cada importação.

## Esquema do Banco de Dados (SQLite)

```sql
-- Alunos importados do PDF
CREATE TABLE alunos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  turma      TEXT,
  criado_em  TEXT NOT NULL
);

-- Responsáveis vinculados a cada aluno
CREATE TABLE responsaveis (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id  INTEGER NOT NULL REFERENCES alunos(id),
  nome      TEXT NOT NULL,
  telefone  TEXT NOT NULL
);

-- Registro diário de faltas
CREATE TABLE faltas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id  INTEGER NOT NULL REFERENCES alunos(id),
  data      TEXT NOT NULL,
  criado_em TEXT NOT NULL
);

-- Log de alertas enviados (evita duplicação)
CREATE TABLE alertas_enviados (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id     INTEGER NOT NULL REFERENCES alunos(id),
  tipo_alerta  TEXT NOT NULL, -- 'consecutivas' | 'mensal'
  enviado_em   TEXT NOT NULL
);
```

## Pré-requisitos

- Node.js >= 18
- Um número de WhatsApp ativo no celular (autenticação por QR Code na primeira execução)

## Instalação

```bash
git clone <url-do-repositorio>
cd faltas-bot
npm install
```

## Uso

```bash
# 1. Importar o relatório de faltas em PDF
node index.js importar --pdf ./relatorio.pdf

# 2. Cadastrar responsáveis dos alunos sem vínculo
node index.js responsaveis

# 3. Avaliar regras e enviar alertas via WhatsApp
node index.js alertar
```

Na primeira execução do comando `alertar`, um QR Code será exibido no terminal. Escaneie-o com o WhatsApp do celular para autenticar a sessão. A sessão é salva localmente e não precisa ser refeita nas execuções seguintes.

## Estrutura de Pastas

```
faltas-bot/
├── src/
│   ├── importar.js       # Parsing do PDF e inserção de faltas no banco
│   ├── responsaveis.js   # CLI para cadastro de responsáveis
│   ├── alertas.js        # Lógica das regras e disparo de mensagens
│   └── db.js             # Conexão e queries do SQLite
├── data/
│   └── faltas.db         # Banco SQLite (gerado automaticamente)
├── index.js              # Entry point do CLI
├── package.json
└── README.md
```
