const router = require('express').Router();
const { getAlunos, getAlunoById, insertResponsavel, getFiltros, updateAluno, deleteAluno, deleteAlunosBulk, upsertAluno } = require('../../src/db');

router.get('/', async (req, res) => {
  try {
    const { q, turma, serie, curso, risco } = req.query;
    const alunos = await getAlunos({ q, turma, serie, curso, risco });
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, numero, turma, serie, curso } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    const { id, novo } = await upsertAluno({ nome, numero, turma, serie, curso });
    const aluno = await getAlunoById(id);
    res.status(novo ? 201 : 200).json(aluno);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/filtros', async (req, res) => {
  try {
    res.json(await getFiltros());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids deve ser um array não vazio' });
    if (!ids.every(id => Number.isInteger(id) && id > 0))
      return res.status(400).json({ error: 'IDs inválidos' });
    await deleteAlunosBulk(ids);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID inválido' });
    const aluno = await getAlunoById(id);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/responsaveis', async (req, res) => {
  try {
    const { nome, telefone } = req.body;
    if (!nome || !telefone) return res.status(400).json({ error: 'nome e telefone são obrigatórios' });
    const resp = await insertResponsavel({ alunoId: parseInt(req.params.id), nome, telefone });
    res.status(201).json(resp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, turma, serie, curso, numero } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    const updated = await updateAluno(parseInt(req.params.id), { nome, turma, serie, curso, numero });
    if (!updated) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID inválido' });
    const deleted = await deleteAluno(id);
    if (!deleted) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
