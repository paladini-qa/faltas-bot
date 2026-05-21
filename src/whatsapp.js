const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

let client = null;
let ready = false;
let qrDataUrl = null;

function createClient() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    webVersionCache: {
      type: 'local',
    },
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

  client.initialize().catch(async err => {
    console.error('[WhatsApp] Falha ao inicializar:', err.message);
    // Wait and retry once — handles transient "No LID" errors on reconnect
    await new Promise(r => setTimeout(r, 5000));
    if (client) client.initialize().catch(e => console.error('[WhatsApp] Retry falhou:', e.message));
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
  const numberId = await client.getNumberId(number);
  if (!numberId) throw new Error(`Número ${number} não está registrado no WhatsApp`);
  await client.sendMessage(numberId._serialized, mensagem);
}

async function disconnect() {
  if (client) {
    ready = false;
    qrDataUrl = null;
    await client.destroy().catch(() => {});
    client = null;
  }
}

module.exports = { createClient, isClientReady, getStatus, getQrDataUrl, sendMessage, disconnect };
