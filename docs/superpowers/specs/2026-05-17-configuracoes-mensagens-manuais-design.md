# Configurações & Mensagens Manuais — Design Spec

**Date:** 2026-05-17  
**Status:** Approved  
**Primary user:** School secretary / administrative staff

---

## Goal

Add two new screens to the Faltas Bot frontend:

1. **Configurações** (`/configuracoes`) — edit alert thresholds and WhatsApp message templates without touching code
2. **Mensagem Manual** (`/mensagens`) — send a WhatsApp message to the guardians of a specific student or an entire class, using a pre-loaded editable template

---

## Architecture

### Backend changes

**New DB table** — `configuracoes`:
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
```

**Default rows** (seeded on first startup if missing):
| chave | valor |
|-------|-------|
| `threshold_consecutivas` | `3` |
| `threshold_mensal` | `5` |
| `template_consecutivas` | `Olá {responsavel}! Tudo bem? Notamos que {aluno} possui {faltas} faltas consecutivas. Entre em contato com a escola para mais informações.` |
| `template_mensal` | `Olá {responsavel}! Tudo bem? Notamos que {aluno} possui {faltas} faltas no período de 1 mês. Entre em contato com a escola para mais informações.` |

**New DB helpers** in `src/db.js`:
- `getConfiguracoes()` → returns `{ threshold_consecutivas, threshold_mensal, template_consecutivas, template_mensal }` as an object
- `saveConfiguracoes(data)` → upserts all keys from `data`

**Update `src/alertas.js`**:
- Replace hardcoded `MENSAGENS` and thresholds with a call to `getConfiguracoes()` at the start of `avaliarEEnviarAlertas()`
- The `temFaltasConsecutivas(faltas, n)` and `temFaltasMensais(faltas, n)` functions must accept threshold `n` as a parameter instead of hardcoding 3/5
- Template variable substitution: replace `{responsavel}`, `{aluno}`, `{faltas}` in template string

**New route** `server/routes/configuracoes.js`:
- `GET /api/configuracoes` — returns current config object
- `PUT /api/configuracoes` — accepts `{ threshold_consecutivas, threshold_mensal, template_consecutivas, template_mensal }`, validates, saves

**New route** `server/routes/mensagens.js`:
- `POST /api/mensagens/enviar` — sends a WhatsApp message manually
  - Body: `{ telefones: string[], mensagem: string, alunoId?: number }`
  - Calls `sendMessage()` for each phone number
  - Records each send in `alertas_enviados` with `tipo_alerta = 'manual'`
  - Returns `{ enviados: number, erros: string[] }`

**Register both routes** in `server/index.js`.

**New API helpers** in `client/src/api.js`:
- `api.configuracoes()` — GET config
- `api.saveConfiguracoes(data)` — PUT config
- `api.enviarMensagemManual({ telefones, mensagem, alunoId })` — POST

### Frontend changes

**New pages:**
- `client/src/pages/Configuracoes.jsx`
- `client/src/pages/Mensagens.jsx`

**Modified:**
- `client/src/components/Sidebar.jsx` — add two new nav links: `{ to: '/configuracoes', label: 'Configurações', icon: '⚙️' }` and `{ to: '/mensagens', label: 'Mensagens', icon: '📨' }`
- `client/src/App.jsx` — add two new `<Route>` entries
- `client/src/api.js` — add three new helpers

---

## Page Designs

### Configurações (`/configuracoes`)

**Layout**: single column, `max-w-2xl mx-auto p-6`

**Section 1 — Limiares de alerta** (`bg-white border border-slate-200 rounded-xl`):
- Two rows: "Faltas consecutivas" and "Faltas em 30 dias"
- Each row: label + description on the left, `−` / value / `+` spinner on the right
- Minimum value: 1. Maximum: 30.
- Label: `text-sm font-semibold text-slate-900`, description: `text-xs text-slate-500`

**Section 2 — Templates de mensagem** (`bg-white border border-slate-200 rounded-xl`):
- Header shows available variables as code chips: `{responsavel}`, `{aluno}`, `{faltas}`
- Two blocks (separated by `border-t`): template for "3 consecutivas" and "5 em 30 dias" (labels use the current threshold values, not hardcoded "3" and "5")
- Each block: colored badge showing the trigger type, `<textarea>` for editing, and a live preview line below showing the message with sample values substituted
- Preview uses sample values: responsavel = "Maria", aluno = "João", faltas = current threshold

**Save behavior**:
- "Salvar alterações" button in page header, `bg-indigo-600`
- A yellow unsaved-changes warning bar appears when any field is dirty
- On save: `toast.success('Configurações salvas')` or `toast.error(e.message)`
- On load: show skeleton while fetching

### Mensagem Manual (`/mensagens`)

**Layout**: single column, `max-w-2xl mx-auto p-6`, three numbered step cards

**Step 1 — Destinatário**:
- Toggle tabs: "👤 Aluno específico" | "👥 Turma inteira"
- **Aluno mode**: search input that filters students by name (calls `api.alunos({ q })` debounced 300ms), shows dropdown with up to 10 results. On selection: shows student card with name, turma, série, falta count, risk badge, and a checklist of guardians (pre-checked, each showing name + phone). User can uncheck individual guardians.
- **Turma mode**: dropdown with all available turmas (calls `api.filtros()`). On selection: shows count of students and total guardians in that turma. All guardians are included — no individual selection (turma sends are bulk).

**Step 2 — Mensagem**:
- Dropdown to load a template: "3 consecutivas", "5 em 30 dias", "Mensagem em branco"
- When a template is loaded, variables are shown as-is in the textarea — the secretary edits the template text directly
- Below the textarea: a live preview line substituting the first selected guardian's name + aluno name + faltas count as sample values (read-only, just for reference)
- `<textarea>` — fully editable, 4 rows
- Note below textarea: "As variáveis {responsavel}, {aluno} e {faltas} serão substituídas individualmente para cada responsável no momento do envio"

**Step 3 — Confirmar envio**:
- Green summary card: "X mensagens serão enviadas via WhatsApp para os responsáveis de [Nome / Turma X]"
- "📨 Enviar mensagens agora" button — disabled if no recipients or empty message or WhatsApp not connected
- On send: spinner, then `toast.success('X mensagens enviadas')` or `toast.error(e.message)`
- After success: form resets (recipient cleared, message cleared)

---

## Data Flow

### Config load/save
`GET /api/configuracoes` → `Configuracoes.jsx` state → form inputs → dirty check → `PUT /api/configuracoes` → toast

### Manual send (aluno mode)
1. User selects aluno → `api.aluno(id)` populates guardians checklist
2. User edits message template in textarea
3. `POST /api/mensagens/enviar` with `{ alunoId: number, mensagemTemplate: string, telefonesSelecionados: string[] }`
4. Backend queries aluno + selected guardians, substitutes `{responsavel}`, `{aluno}`, `{faltas}` per guardian, calls `sendMessage()` for each
5. Records one `alertas_enviados` row per student with `tipo_alerta = 'manual'`

### Manual send (turma mode)
1. User selects turma → `GET /api/alunos/filtros` provides turma list; backend counts guardians on the fly
2. User edits message template
3. `POST /api/mensagens/enviar` with `{ turma: string, mensagemTemplate: string }`
4. Backend queries all students + guardians for the turma, substitutes per guardian, sends individually
5. Records `alertas_enviados` with `tipo_alerta = 'manual'` for each student

---

## Backend endpoint detail

### `POST /api/mensagens/enviar`

**Variable substitution always happens on the backend** — frontend sends the template text as-is (with `{responsavel}`, `{aluno}`, `{faltas}` intact). This ensures each guardian receives their own name correctly.

**For aluno mode:**
```json
{ "alunoId": 1, "mensagemTemplate": "Olá {responsavel}! ...", "telefonesSelecionados": ["5545999998888"] }
```
Backend queries the aluno (for `{aluno}` and `{faltas}`), fetches selected guardians, substitutes per guardian, sends. Records one `alertas_enviados` row with `tipo_alerta = 'manual'` for the student.

**For turma mode:**
```json
{ "turma": "Turma A", "mensagemTemplate": "Olá {responsavel}! ..." }
```
Backend queries all students + guardians for the turma, substitutes `{responsavel}`, `{aluno}`, `{faltas}` per guardian, sends individually. Records `alertas_enviados` with `tipo_alerta = 'manual'` for each student.

---

## Error Handling

- WhatsApp not connected: "Enviar" button disabled, show inline warning "WhatsApp desconectado — acesse a página de Alertas para conectar"
- Partial failures (some sends succeed, some fail): return `{ enviados: N, erros: ['Falha ao enviar para 5545...'] }`, show toast with count + list of failures
- Config save fails: toast error, form stays dirty

---

## Alertas page update

The `Alertas.jsx` table already shows `tipo_alerta` as a badge. Manual messages will appear with a new badge style:
- `tipo_alerta === 'manual'`: `bg-purple-100 text-purple-700` badge — "Manual"

Add this case to the existing `formatTipoAlerta()` helper in `Alertas.jsx`.

---

## Testing

- Settings: change a threshold, save, go to Alertas and trigger send — confirm new threshold is used
- Settings: edit a template, save, reload page — confirm value persists
- Manual (aluno): select student, load template, check preview substitution, send — confirm toast + entry appears in Alertas history with "Manual" badge
- Manual (turma): select turma, check recipient count, send — confirm all guardians received
- Turma send: `{responsavel}` in message is replaced with each guardian's actual name
