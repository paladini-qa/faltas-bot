const router = require('express').Router();
const { getAlunos, getAlunoById, insertResponsavel, getFiltros, updateAluno, deleteAluno, deleteAlunosBulk } = require('../../src/db');

router.get('/', async (req, res) => {
  try {
    const { q, turma, serie, curso, risco } = req.query;
    const alunos = await getAlunos({ q, turma, serie, curso, risco });
    res.json(alunos);
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
    await deleteAlunosBulk(ids);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const aluno = await getAlunoById(parseInt(req.params.id));
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
    const deleted = await deleteAluno(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
