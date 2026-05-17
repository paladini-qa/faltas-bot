const router = require('express').Router();
const { updateFalta, deleteFalta } = require('../../src/db');

router.put('/:id', async (req, res) => {
  try {
    const { data, disciplina, justificada } = req.body;
    if (!data) return res.status(400).json({ error: 'data é obrigatória' });
    const updated = await updateFalta(parseInt(req.params.id), { data, disciplina, justificada });
    if (!updated) return res.status(404).json({ error: 'Falta não encontrada' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteFalta(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Falta não encontrada' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
