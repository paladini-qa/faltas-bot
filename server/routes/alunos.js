const router = require('express').Router();
const { getAlunos, getAlunoById, insertResponsavel, getFiltros } = require('../../src/db');

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

module.exports = router;
