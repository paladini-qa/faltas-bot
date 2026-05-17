const router = require('express').Router();
const { getAlertas } = require('../../src/db');
const { isClientReady, getStatus, getQrDataUrl } = require('../../src/whatsapp');
const { avaliarEEnviarAlertas } = require('../../src/alertas');

router.get('/status', (req, res) => {
  res.json({ status: getStatus(), qr: getQrDataUrl() });
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

module.exports = router;
