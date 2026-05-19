const router = require('express').Router();
const { getAlertas, deleteAlerta } = require('../../src/db');
const { isClientReady, getStatus, getQrDataUrl, disconnect } = require('../../src/whatsapp');
const { avaliarEEnviarAlertas, previewAlertas } = require('../../src/alertas');

router.get('/status', (req, res) => {
  res.json({ status: getStatus(), qr: getQrDataUrl() });
});

router.get('/preview', async (req, res) => {
  try {
    const pendentes = await previewAlertas();
    res.json({ pendentes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await disconnect();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/enviar', async (req, res) => {
  if (!isClientReady()) {
    return res.status(503).json({ error: 'Cliente WhatsApp não está conectado. Escaneie o QR code no terminal do servidor.' });
  }
  try {
    const enviados = await avaliarEEnviarAlertas();
    res.json({ enviados, total: enviados.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    res.json(await getAlertas({ limit }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: 'ID inválido' });
    const deleted = await deleteAlerta(id);
    if (!deleted) return res.status(404).json({ error: 'Alerta não encontrado' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
