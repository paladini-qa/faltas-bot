const router = require('express').Router();
const { deleteResponsavel, updateResponsavel } = require('../../src/db');

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID inválido' });
    const deleted = await deleteResponsavel(id);
    if (!deleted) return res.status(404).json({ error: 'Responsável não encontrado' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID inválido' });
    const { nome, telefone } = req.body;
    if (!nome || !telefone) return res.status(400).json({ error: 'nome e telefone são obrigatórios' });
    const updated = await updateResponsavel(id, { nome, telefone });
    if (!updated) return res.status(404).json({ error: 'Responsável não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
