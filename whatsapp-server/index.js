// ============================================================
// IPTV Manager Pro – Local WhatsApp Server (Baileys)
// ============================================================
// REST API compatible with Evolution API v2 format so the
// existing evolutionApi.ts client works without changes.
//
// Usage:
//   cd whatsapp-server && npm install && npm start
//
// The server listens on http://localhost:8080 by default.
// ============================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

// ========== Config ==========
const PORT = parseInt(process.env.PORT || '8080', 10);
const API_KEY = process.env.API_KEY || 'iptv-manager-local-key';  // Static API key
const AUTH_DIR = path.join(__dirname, 'auth_sessions');

const logger = pino({ level: 'warn' });

// ========== State per instance ==========
// { [instanceName]: { sock, qrBase64, state, authDir, retryCount } }
const instances = {};

// ========== Express Setup ==========
const app = express();
app.use(express.json());
app.use(cors());

// ========== Auth Middleware ==========
function auth(req, res, next) {
  const key = req.headers['apikey'] || req.query.apikey;
  if (key !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
}
app.use(auth);

// ========== Helpers ==========

function getInstance(name) {
  return instances[name] || null;
}

async function createBaileysSocket(instanceName) {
  const authDir = path.join(AUTH_DIR, instanceName);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: true,
    generateHighQualityLinkPreview: false,
    browser: ['IPTV Manager', 'Chrome', '120.0'],
  });

  const instance = {
    sock,
    qrBase64: null,
    state: 'close',      // 'open' | 'close' | 'connecting'
    authDir,
    retryCount: 0,
  };

  // QR code event
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Convert QR string to base64 PNG
      try {
        const base64 = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        instance.qrBase64 = base64;
        instance.state = 'connecting';
        console.log(`[${instanceName}] QR Code generated – scan with WhatsApp`);
      } catch (err) {
        console.error(`[${instanceName}] QR generation error:`, err.message);
      }
    }

    if (connection === 'open') {
      instance.state = 'open';
      instance.qrBase64 = null;
      instance.retryCount = 0;
      console.log(`[${instanceName}] ✅ Connected to WhatsApp`);
    }

    if (connection === 'close') {
      instance.state = 'close';
      instance.qrBase64 = null;

      const statusCode =
        lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[${instanceName}] Connection closed. Code: ${statusCode}. Reconnect: ${shouldReconnect}`
      );

      if (shouldReconnect && instance.retryCount < 5) {
        instance.retryCount++;
        console.log(`[${instanceName}] Reconnecting (attempt ${instance.retryCount})...`);
        // Re-create the socket to reconnect
        setTimeout(async () => {
          try {
            const newInst = await createBaileysSocket(instanceName);
            instances[instanceName] = newInst;
          } catch (e) {
            console.error(`[${instanceName}] Reconnect failed:`, e.message);
          }
        }, 3000);
      } else if (statusCode === DisconnectReason.loggedOut) {
        // Clean auth files on logout
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
        delete instances[instanceName];
        console.log(`[${instanceName}] Logged out and session cleared.`);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  instances[instanceName] = instance;
  return instance;
}

// ============================================================
// Routes – Evolution API v2 compatible format
// ============================================================

// POST /instance/create
app.post('/instance/create', async (req, res) => {
  const name = req.body.instanceName || 'default';

  if (instances[name]) {
    return res.status(409).json({ instance: { instanceName: name, status: 'already_exists' } });
  }

  try {
    await createBaileysSocket(name);
    res.json({ instance: { instanceName: name, status: 'created' } });
  } catch (err) {
    console.error('Create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /instance/connect/:name – returns QR code
app.get('/instance/connect/:name', async (req, res) => {
  const name = req.params.name;
  let inst = getInstance(name);

  if (!inst) {
    // Auto-create if not exists
    try {
      inst = await createBaileysSocket(name);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Wait briefly for QR to be generated
  let attempts = 0;
  while (!inst.qrBase64 && inst.state !== 'open' && attempts < 20) {
    await new Promise((r) => setTimeout(r, 500));
    inst = instances[name]; // refresh reference
    if (!inst) break;
    attempts++;
  }

  if (!inst) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  if (inst.state === 'open') {
    return res.json({ base64: null, code: null, pairingCode: null, count: 0, message: 'Already connected' });
  }

  res.json({
    base64: inst.qrBase64 || null,
    code: null,
    pairingCode: null,
    count: 1,
  });
});

// GET /instance/connectionState/:name
app.get('/instance/connectionState/:name', (req, res) => {
  const inst = getInstance(req.params.name);
  if (!inst) {
    return res.json({ instance: req.params.name, state: 'close' });
  }
  res.json({ instance: req.params.name, state: inst.state });
});

// POST /message/sendText/:name
app.post('/message/sendText/:name', async (req, res) => {
  const inst = getInstance(req.params.name);
  if (!inst || inst.state !== 'open') {
    return res.status(400).json({ error: 'Not connected' });
  }

  const { number, text } = req.body;
  if (!number || !text) {
    return res.status(400).json({ error: 'Missing number or text' });
  }

  // Normalize phone number to WhatsApp JID format
  let digits = String(number).replace(/\D/g, '');
  if (!digits.endsWith('@s.whatsapp.net')) {
    digits = digits + '@s.whatsapp.net';
  }

  try {
    const result = await inst.sock.sendMessage(digits, { text });
    console.log(`[${req.params.name}] Message sent to ${digits}`);
    res.json({
      key: result.key,
      status: 'SENT',
    });
  } catch (err) {
    console.error(`[${req.params.name}] Send error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /instance/logout/:name
app.delete('/instance/logout/:name', async (req, res) => {
  const inst = getInstance(req.params.name);
  if (inst) {
    try {
      await inst.sock.logout();
    } catch {
      // may already be disconnected
    }
    // Clean auth
    if (fs.existsSync(inst.authDir)) {
      fs.rmSync(inst.authDir, { recursive: true, force: true });
    }
    delete instances[req.params.name];
  }
  res.json({ status: 'logged_out' });
});

// DELETE /instance/delete/:name
app.delete('/instance/delete/:name', async (req, res) => {
  const inst = getInstance(req.params.name);
  if (inst) {
    try {
      inst.sock.end();
    } catch { /* ignore */ }
    if (fs.existsSync(inst.authDir)) {
      fs.rmSync(inst.authDir, { recursive: true, force: true });
    }
    delete instances[req.params.name];
  }
  res.json({ status: 'deleted' });
});

// GET / – health check
app.get('/', (_req, res) => {
  const list = Object.entries(instances).map(([name, inst]) => ({
    instanceName: name,
    state: inst.state,
  }));
  res.json({ status: 'ok', instances: list, uptime: process.uptime() });
});

// ========== Start Server ==========
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  IPTV Manager – WhatsApp Server (Baileys)   ║');
  console.log(`║  http://localhost:${PORT}                        ║`);
  console.log(`║  API Key: ${API_KEY.slice(0, 20)}...           ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('➡️  Configure no sistema:');
  console.log(`   URL da API:  http://localhost:${PORT}`);
  console.log(`   API Key:     ${API_KEY}`);
  console.log(`   Instância:   iptv-manager`);
  console.log('');
});
