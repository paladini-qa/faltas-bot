const router = require('express').Router();
const { deleteResponsavel } = require('../../src/db');

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteResponsavel(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Responsável não encontrado' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
