# Faltas Bot — Requirements

## Project Overview

Faltas Bot is a Node.js application for monitoring student absences and sending automatic WhatsApp alerts to guardians. It includes a web dashboard for school administrative staff (secretaries).

## Users

**Primary user:** School secretary / administrative staff  
**Goal:** Monitor student attendance, identify at-risk students, manage guardians, and send WhatsApp alerts — all from a single interface.

## Functional Requirements

### Dashboard
- Display summary statistics: total students, unjustified absences, at-risk students, sent alerts
- Show a priority action section listing at-risk students (≥5 unjustified absences) by name, class, and absence count
- Provide quick-action shortcuts: Import PDF, Send Alerts, View All Students

### Student List (Alunos)
- List all students with: name, class (turma), grade (série), unjustified absence count, guardian count, risk status
- Filter by: name search, turma, série, curso
- Filter chips for risk level: Alto risco, Em risco, Regular
- Visual risk indicators: left border color + row background tint per risk level
- Clicking any row navigates to the student detail page

### Student Detail (AlunoDetalhe)
- Show student header: name, turma, série, curso, unjustified absence count, risk badge
- Two-column layout: guardians panel (left) + absences by subject (right)
- Guardian management: list existing guardians, add new guardian (name + WhatsApp phone), remove guardian with inline confirmation
- Absences grouped by subject with color-coded date chips (red = unjustified, green = justified)
- Toast notifications for add/remove actions (replaces `window.alert` and `window.confirm`)

### PDF Import (Upload)
- Drag-and-drop or click-to-select PDF upload
- Processing spinner during upload
- Result card showing: disciplina, turma/série, student count (new vs existing), faltas saved
- Link to filtered student list after import ("Ver alunos afetados")

### Alerts (Alertas)
- Prominent WhatsApp connection status bar (green/yellow/red) at the top
- "Verificar e Enviar Alertas" button, disabled when WhatsApp is disconnected
- QR code display when status is `aguardando_qr`
- Send result summary listing which students received alerts and why
- Alert history table with: student name (links to detail), turma, alert type badge (colored), sent timestamp
- Alert type badges: "5 em 30d" (blue) and "3 consecutivas" (orange)

## Non-Functional Requirements

### UI & UX
- Clean, minimal visual style (white space, subtle shadows)
- Left sidebar navigation with icons + labels (replaces top navbar)
- Sidebar: dark background (`#0f172a`), icon + label per nav item, alert badge on Alertas, WhatsApp status at bottom
- Risk color system: 🔴 Alto risco (≥10 faltas) — red, 🟠 Em risco (≥5) — orange, 🟢 Regular — green
- Skeleton loaders replace plain "Carregando..." text
- No `window.alert()` or `window.confirm()` — use toast notifications and inline confirmation UI
- Fully responsive; sidebar collapses on mobile

### Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Express (port 3001)
- Database: PostgreSQL
- WhatsApp: whatsapp-web.js

## Alert Rules (existing, unchanged)
- 3 consecutive absences → warning message to guardian
- 5 absences within 30 days → warning message to guardian
- Deduplication via `alertas_enviados` table
- Risk thresholds in UI: ≥5 unjustified = "Em risco", ≥10 = "Alto risco"

## Out of Scope
- Dark mode
- Role-based access / multi-user auth
- Pagination (current data volume doesn't require it)
- Editing or deleting absence records
