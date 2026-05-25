const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

let client = null;
let ready = false;
let qrDataUrl = null;

function getChromePath() {
  if (process.platform !== 'win32') {
    return null;
  }
  const paths = [
    // Google Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    // Microsoft Edge
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function createClient() {
  const chromePath = getChromePath();
  const puppeteerOpts = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  };
  
  if (chromePath) {
    console.log(`[WhatsApp] Usando navegador local encontrado em: ${chromePath}`);
    puppeteerOpts.executablePath = chromePath;
  } else if (process.platform === 'win32') {
    console.warn('[WhatsApp] ATENÇÃO: Google Chrome ou Microsoft Edge não foram encontrados nas pastas padrão do Windows. O WhatsApp Web pode falhar ao iniciar.');
  }

  const isPackaged = typeof process.pkg !== 'undefined';
  const baseDir = isPackaged ? path.dirname(process.execPath) : '.';
  const authDataPath = path.join(baseDir, '.wwebjs_auth');

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: authDataPath }),
    puppeteer: puppeteerOpts,
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
