const router = require('express').Router();
const { deleteResponsavel, updateResponsavel } = require('../../src/db');

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteResponsavel(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Responsável não encontrado' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, telefone } = req.body;
    if (!nome || !telefone) return res.status(400).json({ error: 'nome e telefone são obrigatórios' });
    const updated = await updateResponsavel(parseInt(req.params.id), { nome, telefone });
    if (!updated) return res.status(404).json({ error: 'Responsável não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
