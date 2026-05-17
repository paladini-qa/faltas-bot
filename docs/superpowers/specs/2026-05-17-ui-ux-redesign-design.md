# UI/UX Redesign — Design Spec

**Date:** 2026-05-17  
**Status:** Approved  
**Primary user:** School secretary / administrative staff

---

## Goal

Redesign the Faltas Bot frontend from a plain top-nav app into a professional, secretary-focused tool with a clear workflow: import PDF → review at-risk students → send alerts. The visual direction is clean & minimal (white space, subtle shadows, Notion/Linear aesthetic).

---

## Architecture

No backend changes. All changes are in `client/src/`.

### New files
- `client/src/components/Sidebar.jsx` — replaces `Navbar.jsx`
- `client/src/components/Toast.jsx` + `client/src/hooks/useToast.js` — notification system
- `client/src/components/SkeletonRow.jsx` — table skeleton loader
- `client/src/components/ConfirmModal.jsx` — inline confirmation (replaces `window.confirm`)

### Modified files
- `client/src/App.jsx` — switch to sidebar shell layout
- `client/src/index.css` — no changes expected; skeleton animation uses Tailwind's built-in `animate-pulse`
- `client/src/pages/Dashboard.jsx` — priority banner + quick actions
- `client/src/pages/Alunos.jsx` — risk chips, row coloring, clickable rows
- `client/src/pages/AlunoDetalhe.jsx` — two-column layout, toast, inline confirm
- `client/src/pages/Upload.jsx` — polished drop zone + "Ver alunos afetados" link
- `client/src/pages/Alertas.jsx` — prominent status bar, alert type badges

### Deleted files
- `client/src/components/Navbar.jsx` — replaced by Sidebar

---

## Component Designs

### Sidebar
- Fixed left sidebar, `w-56` (224px), dark background `bg-slate-900`
- Logo + "Gestão de frequência" subtitle at top
- Nav items: emoji icon + label (no icon library needed); active item has `bg-slate-800` highlight
- WhatsApp status indicator pinned to the bottom (`● Conectado` in green/yellow/red)
- On mobile (`< md`): sidebar hidden, hamburger button shows/hides it

### Toast System
- `useToast()` hook exposes `toast.success(msg)`, `toast.error(msg)`
- Toasts appear bottom-right, stack vertically, auto-dismiss after 3s
- Replaces all `window.alert()` and success `alert()` calls

### ConfirmModal
- Small centered modal with message, Cancel, and Confirm (red) buttons
- Triggered via `useConfirm()` hook: `await confirm('Remover responsável?')`
- Replaces all `window.confirm()` calls

### SkeletonRow
- Animated gray bars (`animate-pulse`) replacing "Carregando..." text
- Used in: Alunos table, Alertas table, AlunoDetalhe sections

---

## Page Designs

### Dashboard
1. Page header: title + today's date + "Importar PDF" primary button
2. **Priority banner** (visible only when `stats.alunos_em_risco > 0`): red-tinted card listing top at-risk students by name + falta count + link to filtered `/alunos?risco=alto`
3. 4 stat cards in a grid: Total Alunos, Faltas Injustificadas, Alunos em Risco, Alertas Enviados — each links to relevant page
4. Quick actions row: 3 cards (Importar PDF, Enviar Alertas, Ver Alunos)

### Alunos
1. Header: "Alunos" title + subtitle `{n} alunos · {n} em risco`
2. Filter bar: search input + 3 dropdowns + 3 risk filter chips (toggle)
3. Table with left border color per risk: red (`border-l-red-500`) = alto risco, orange = em risco, transparent = regular; row background tinted accordingly
4. Clicking any row navigates to `/alunos/:id` (remove "Ver" link column)

### AlunoDetalhe
1. Back link + student header (name, tags, risk badge)
2. Two-column grid (`grid-cols-[1fr_1.4fr]`):
   - Left: guardian list + stacked add form (name input, phone input, submit button)
   - Right: faltas grouped by disciplina with date chips
3. Toast on guardian add/remove success
4. ConfirmModal on guardian remove

### Upload
- Keep existing drag-and-drop logic unchanged
- Visual: indigo dashed border, indigo drop zone icon, explicit "Selecionar arquivo" button
- Result card: add a "Ver alunos afetados →" link pointing to `/alunos` (filtered by turma/curso from result)

### Alertas
1. WhatsApp status bar at top: full-width colored card (green/yellow/red) + send button on the right
2. QR code section unchanged (only shows when `aguardando_qr`)
3. Send result: inline info card listing sent alerts with student name + reason
4. Table: add colored badges for alert type ("5 em 30d" blue, "3 consecutivas" orange)

---

## Data Flow

All improvements are purely presentational or replace browser dialogs with React UI, except one backend addition:

**Dashboard priority banner** needs a list of at-risk students. `GET /api/dashboard` currently returns only the count. Add a `top_risco` array (top 5 by `faltas_injustificadas` desc) to the existing dashboard response — same route, no new endpoint, no breaking change. Shape:

```json
{
  "total_alunos": 142,
  "total_faltas": 387,
  "alunos_em_risco": 23,
  "total_alertas": 45,
  "top_risco": [
    { "id": 1, "nome": "João da Silva", "turma": "Turma A", "faltas_injustificadas": 14 }
  ]
}
```

The Alunos risk filter chips add `?risco=alto|medio` to the URL params, which the existing filter system passes through to `GET /api/alunos`. The backend route `alunos.js` needs to handle this new param and translate it to a `WHERE faltas_injustificadas >= 10` (alto) or `>= 5` (medio) condition.

---

## Error Handling

- API errors: toast with red variant (`toast.error(e.message)`)
- Upload errors: existing red banner stays, just restyled
- WhatsApp disconnected: send button disabled, status bar shows red

---

## Testing

- Visual smoke test: load each page, verify no layout breakage
- Toast: add a guardian → toast appears and disappears after 3s
- ConfirmModal: click remove → modal appears → cancel → nothing happens; confirm → guardian removed
- Risk colors: student with ≥10 faltas has red row; ≥5 has orange; <5 has no tint
- Mobile: sidebar hidden by default, hamburger shows it
