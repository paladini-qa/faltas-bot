const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

let client = null;
let ready = false;
let qrDataUrl = null;

function createClient() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
  });

  client.on('qr', async qr => {
    qrDataUrl = await QRCode.toDataURL(qr);
    console.log('[WhatsApp] Novo QR code gerado — escaneie na interface web.');
  });

  client.on('ready', () => {
    ready = true;
    qrDataUrl = null;
    console.log('[WhatsApp] Cliente conectado e pronto.');
  });

  client.on('auth_failure', () => {
    ready = false;
    console.error('[WhatsApp] Falha na autenticação.');
  });

  client.on('disconnected', reason => {
    ready = false;
    console.log('[WhatsApp] Desconectado:', reason);
  });

  client.initialize().catch(err => {
    console.error('[WhatsApp] Falha ao inicializar:', err.message);
  });
  return client;
}

function isClientReady() {
  return ready;
}

function getStatus() {
  if (!client) return 'desconectado';
  if (ready) return 'conectado';
  return 'aguardando_qr';
}

function getQrDataUrl() {
  return qrDataUrl;
}

async function sendMessage(telefone, mensagem) {
  if (!ready) throw new Error('Cliente WhatsApp não está conectado');
  const number = telefone.replace(/\D/g, '');
  await client.sendMessage(`${number}@c.us`, mensagem);
}

module.exports = { createClient, isClientReady, getStatus, getQrDataUrl, sendMessage };
