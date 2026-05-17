# Deleção em Lote de Alunos (Multi-Select) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir seleção múltipla de alunos na listagem e excluí-los em uma única operação atômica.

**Architecture:** Nova função `deleteAlunosBulk` no banco usa `DELETE WHERE id = ANY($1)` em uma chamada. Uma nova rota `POST /alunos/bulk-delete` expõe isso via HTTP. O frontend adiciona uma coluna de checkboxes sempre visível, barra de ação contextual e reutiliza o `ConfirmModal` existente.

**Tech Stack:** Express (Node.js), PostgreSQL (pg), React, Tailwind CSS

---

### Task 1: Adicionar `deleteAlunosBulk` em `src/db.js`

**Files:**
- Modify: `src/db.js`

- [ ] **Step 1: Adicionar a função após `deleteAluno`**

Em `src/db.js`, logo após a função `deleteAluno` (linha ~236), adicionar:

```js
async function deleteAlunosBulk(ids) {
  await pool.query('DELETE FROM alunos WHERE id = ANY($1)', [ids]);
}
```

- [ ] **Step 2: Exportar a nova função**

No `module.exports` ao final do arquivo, adicionar `deleteAlunosBulk` à lista:

```js
module.exports = {
  initSchema,
  upsertAluno,
  insertFalta,
  getDashboardStats,
  getAlunos,
  getAlunoById,
  insertResponsavel,
  deleteResponsavel,
  getAlertas,
  getFiltros,
  getConfiguracoes,
  saveConfiguracoes,
  updateAluno,
  deleteAluno,
  deleteAlunosBulk,
  updateResponsavel,
  updateFalta,
  deleteFalta,
  deleteAlerta,
};
```

- [ ] **Step 3: Verificar manualmente**

Confirmar que o servidor inicia sem erros:
```bash
node -e "const db = require('./src/db'); console.log(typeof db.deleteAlunosBulk)"
```
Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add src/db.js
git commit -m "feat: add deleteAlunosBulk to db"
```

---

### Task 2: Adicionar rota `POST /alunos/bulk-delete` no servidor

**Files:**
- Modify: `server/routes/alunos.js`

- [ ] **Step 1: Importar `deleteAlunosBulk` no topo do arquivo**

Alterar a linha de `require` existente:

```js
const { getAlunos, getAlunoById, insertResponsavel, getFiltros, updateAluno, deleteAluno, deleteAlunosBulk } = require('../../src/db');
```

- [ ] **Step 2: Adicionar a rota antes de `router.get('/:id')`**

A rota `/bulk-delete` deve vir **antes** do matcher dinâmico `/:id` para não ser capturada por ele. Inserir logo após `router.get('/filtros', ...)`:

```js
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids deve ser um array não vazio' });
    await deleteAlunosBulk(ids);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Verificar manualmente (com servidor rodando)**

```bash
# Inicie o servidor: npm run server
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/alunos/bulk-delete \
  -H "Content-Type: application/json" \
  -d '{"ids":[]}'
# Expected: 400

curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/alunos/bulk-delete \
  -H "Content-Type: application/json" \
  -d '"not-an-array"'
# Expected: 400
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/alunos.js
git commit -m "feat: add POST /alunos/bulk-delete route"
```

---

### Task 3: Adicionar `deleteAlunosBulk` no cliente API

**Files:**
- Modify: `client/src/api.js`

- [ ] **Step 1: Adicionar método ao objeto `api`**

Em `client/src/api.js`, após `deleteAluno`, adicionar:

```js
deleteAlunosBulk: (ids) =>
  fetch(`${BASE}/alunos/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  }).then(r => {
    if (!r.ok && r.status !== 204) throw new Error(r.statusText);
  }),
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api.js
git commit -m "feat: add deleteAlunosBulk to api client"
```

---

### Task 4: Atualizar `Alunos.jsx` — estado de seleção e coluna de checkboxes

**Files:**
- Modify: `client/src/pages/Alunos.jsx`

- [ ] **Step 1: Adicionar estado `selected`**

Após a linha `const { toasts, toast } = useToast();` (linha ~45), adicionar:

```js
const [selected, setSelected] = useState(new Set());
```

- [ ] **Step 2: Limpar seleção ao mudar filtros**

Adicionar um `useEffect` após o useEffect que carrega alunos (após linha ~62):

```js
useEffect(() => {
  setSelected(new Set());
}, [q, turma, serie, curso, risco]);
```

- [ ] **Step 3: Adicionar handlers de seleção**

Após a função `confirmDelete` (linha ~86), adicionar:

```js
function toggleSelect(id) {
  setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
}

function toggleSelectAll() {
  if (selected.size === alunos.length && alunos.length > 0) {
    setSelected(new Set());
  } else {
    setSelected(new Set(alunos.map(a => a.id)));
  }
}
```

- [ ] **Step 4: Adicionar coluna de checkbox no `<thead>`**

Alterar o `<thead>` para incluir uma nova `<th>` como primeira coluna:

```jsx
<thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
  <tr>
    <th className="px-4 py-3 w-10">
      <input
        type="checkbox"
        checked={alunos.length > 0 && selected.size === alunos.length}
        ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < alunos.length; }}
        onChange={toggleSelectAll}
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
        disabled={loading || alunos.length === 0}
      />
    </th>
    <th className="px-4 py-3 font-medium">Nome</th>
    <th className="px-4 py-3 font-medium">Turma</th>
    <th className="px-4 py-3 font-medium">Série</th>
    <th className="px-4 py-3 font-medium">Faltas inj.</th>
    <th className="px-4 py-3 font-medium">Responsáveis</th>
    <th className="px-4 py-3 font-medium">Status</th>
    <th className="px-4 py-3 w-10" />
  </tr>
</thead>
```

- [ ] **Step 5: Adicionar `<td>` de checkbox em cada linha de aluno**

Na renderização de cada `<tr>` de aluno (dentro do `.map(a => ...)`), adicionar como **primeiro `<td>`**:

```jsx
<td className="px-4 py-3" onClick={e => e.stopPropagation()}>
  <input
    type="checkbox"
    checked={selected.has(a.id)}
    onChange={() => toggleSelect(a.id)}
    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
  />
</td>
```

- [ ] **Step 6: Corrigir `colSpan` de 7 para 8**

Nos dois lugares onde `colSpan={7}` aparece (loading skeleton e "Nenhum aluno encontrado"), alterar para `colSpan={8}`.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Alunos.jsx
git commit -m "feat: add multi-select checkboxes to alunos table"
```

---

### Task 5: Adicionar barra de ação contextual e fluxo de deleção em lote

**Files:**
- Modify: `client/src/pages/Alunos.jsx`

- [ ] **Step 1: Adicionar estado para confirm modal em lote**

O `confirmState` existente é para deleção individual. Adicionar estado separado para lote:

```js
const [confirmBulk, setConfirmBulk] = useState(false);
```

Adicionar logo após a linha do `useState(confirmState)`.

- [ ] **Step 2: Adicionar função de deleção em lote**

Após `confirmDelete`, adicionar:

```js
async function confirmBulkDelete() {
  const ids = [...selected];
  await api.deleteAlunosBulk(ids);
  setAlunos(prev => prev.filter(a => !selected.has(a.id)));
  const count = ids.length;
  toast.success(`${count} aluno${count !== 1 ? 's' : ''} excluído${count !== 1 ? 's' : ''}`);
  setSelected(new Set());
  setConfirmBulk(false);
}
```

- [ ] **Step 3: Adicionar `ConfirmModal` para lote**

Logo após o `<ConfirmModal>` existente (linha ~90), adicionar:

```jsx
<ConfirmModal
  open={confirmBulk}
  message={`Excluir ${selected.size} aluno${selected.size !== 1 ? 's' : ''} selecionado${selected.size !== 1 ? 's' : ''}? Todos os dados associados serão removidos.`}
  onConfirm={confirmBulkDelete}
  onCancel={() => setConfirmBulk(false)}
/>
```

- [ ] **Step 4: Adicionar barra de ação contextual**

Logo **acima** da `<div>` da tabela (antes da linha `<div className="bg-white border ...`), adicionar:

```jsx
{selected.size > 0 && (
  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
    <span className="font-medium text-red-700">
      {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
    </span>
    <button
      onClick={() => setConfirmBulk(true)}
      className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
    >
      Excluir selecionados
    </button>
    <button
      onClick={() => setSelected(new Set())}
      className="px-3 py-1 text-slate-600 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
    >
      Limpar seleção
    </button>
  </div>
)}
```

- [ ] **Step 5: Verificar no browser**

Iniciar o app com `npm run dev` e testar:
1. Checkboxes visíveis em todas as linhas
2. Checkbox de header faz select-all / deselect-all
3. Checkbox de header fica indeterminate com seleção parcial
4. Barra de ação aparece ao selecionar ao menos um aluno
5. "Limpar seleção" desmarca tudo sem deletar
6. "Excluir selecionados" abre modal com contagem correta
7. Confirmar deleta e remove da lista com toast correto
8. Cancelar fecha modal sem deletar
9. Mudar filtro limpa seleção

- [ ] **Step 6: Commit final**

```bash
git add client/src/pages/Alunos.jsx
git commit -m "feat: batch delete alunos with multi-select action bar"
```
