const router = require('express').Router();
const { getConfiguracoes, saveConfiguracoes } = require('../../src/db');

router.get('/', async (req, res) => {
  try {
    res.json(await getConfiguracoes());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const allowed = ['threshold_consecutivas', 'threshold_mensal', 'template_consecutivas', 'template_mensal'];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado' });
    }
    await saveConfiguracoes(data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
