const express = require('express');
const http = require('http');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "bot" }), // Saved to .wwebjs_auth/
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO for sending QR to front-end
io.on('connection', socket => {
  console.log('Client connected');

  client.on('qr', async qr => {
    const qrImageUrl = await qrcode.toDataURL(qr);
    socket.emit('qr', qrImageUrl);
  });

  client.on('ready', () => {
    console.log('Client is ready!');
    socket.emit('ready', 'WhatsApp is ready!');
  });

  client.on('authenticated', () => {
    console.log('Authenticated');
    socket.emit('authenticated', 'Authenticated');
  });

  client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    socket.emit('auth_failure', 'Auth failure');
  });

  client.on('disconnected', reason => {
    console.log('Client was logged out', reason);
    socket.emit('disconnected', reason);
  });

  // Optional: reply to messages
  client.on('message', async msg => {
    if (msg.body.toLowerCase() === 'hi') {
      msg.reply('Hello! How can I help you today?');
    }
  });
});

client.initialize();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
