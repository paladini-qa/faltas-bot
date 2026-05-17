# Design: Deleção em Lote de Alunos (Multi-Select)

**Data:** 2026-05-17  
**Status:** Aprovado

---

## Objetivo

Permitir que o usuário selecione múltiplos alunos na página `/alunos` e os exclua em uma única operação confirmada.

---

## Arquitetura

A feature envolve três camadas:

1. **Frontend** (`client/src/pages/Alunos.jsx`) — UI de seleção e ação em lote
2. **API client** (`client/src/api.js`) — novo método `deleteAlunosBulk`
3. **Backend** — nova rota `POST /alunos/bulk-delete` e nova função `deleteAlunosBulk` no `src/db.js`

---

## Frontend — `Alunos.jsx`

### Estado

```js
const [selected, setSelected] = useState(new Set()); // Set de IDs (number)
```

### Coluna de Checkbox

Adicionada como **primeira coluna** da tabela (antes de "Nome").

- **Header:** checkbox indeterminate quando seleção parcial, checked quando todos selecionados. Clique faz select-all ou deselect-all dos alunos visíveis no estado atual (`alunos`).
- **Cada linha:** `<input type="checkbox" checked={selected.has(a.id)} onChange={...}>` com `e.stopPropagation()` para não disparar navegação para detalhe do aluno.

### Barra de Ação Contextual

Renderizada condicionalmente **acima da tabela** quando `selected.size > 0`:

```
bg-red-50 border border-red-200 rounded-lg px-4 py-2
[ N selecionado(s) ]  [ Excluir selecionados ]  [ Limpar seleção ]
```

- O contador mostra o número atual de IDs no Set.
- "Excluir selecionados" abre o `ConfirmModal` com mensagem adaptada.
- "Limpar seleção" limpa o Set sem deletar nada.

### Modal de Confirmação

Reutiliza `ConfirmModal` existente. Mensagem:
> "Excluir N aluno(s) selecionado(s)? Todos os dados associados serão removidos."

### Fluxo de Deleção

1. Usuário confirma no modal.
2. Chama `api.deleteAlunosBulk([...selected])`.
3. Remove os alunos deletados do estado local: `setAlunos(prev => prev.filter(a => !selected.has(a.id)))`.
4. Limpa `selected`.
5. Exibe toast: "N aluno(s) excluído(s)" via `toast.success`.

### Limpeza de Seleção ao Filtrar

`useEffect` observando `[q, turma, serie, curso, risco]` limpa `selected` quando os filtros mudam, evitando IDs "fantasma" selecionados que sumiriam da lista filtrada.

```js
useEffect(() => {
  setSelected(new Set());
}, [q, turma, serie, curso, risco]);
```

### `colSpan` da tabela

O `colSpan` nas linhas de loading/vazio passa de `7` para `8` (nova coluna de checkbox).

---

## API Client — `client/src/api.js`

Novo método adicionado ao objeto `api`:

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

---

## Backend

### `src/db.js` — nova função

```js
async function deleteAlunosBulk(ids) {
  await pool.query('DELETE FROM alunos WHERE id = ANY($1)', [ids]);
}
```

Exportada junto com as demais funções no `module.exports`.

### `server/routes/alunos.js` — nova rota

```
POST /alunos/bulk-delete
Body: { ids: number[] }
Response: 204 No Content
```

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

Esta rota deve ser registrada **antes** de `router.get('/:id')` para não colidir com o matcher de parâmetro dinâmico.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `client/src/pages/Alunos.jsx` | Estado `selected`, coluna checkbox, barra contextual, fluxo bulk delete |
| `client/src/api.js` | Adicionar `deleteAlunosBulk` |
| `server/routes/alunos.js` | Adicionar rota `POST /bulk-delete` e importar `deleteAlunosBulk` |
| `src/db.js` | Adicionar e exportar `deleteAlunosBulk` |

Nenhum arquivo novo precisa ser criado.

---

## Fora de Escopo

- Deleção em lote em outras páginas (Alertas, Responsáveis)
- Persistência da seleção entre navegações
- Undo/desfazer após deleção
