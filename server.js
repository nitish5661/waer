const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { Configuration, OpenAIApi } = require('openai');
const http = require('http');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

const openai = new OpenAIApi(new Configuration({
  apiKey: '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'
}));

app.use(express.static('public'));
app.use(express.json());

let qrReady = false;
let qrData = '';

client.on('qr', async (qr) => {
  qrReady = true;
  qrData = await qrcode.toDataURL(qr);
  io.emit('qr', qrData);
});

client.on('ready', () => {
  io.emit('ready');
  console.log('WhatsApp is ready!');
});

client.on('message', async msg => {
  const aiReply = await generateReply(msg.body);
  io.emit('message', {
    from: msg.from,
    body: msg.body,
    ai: aiReply
  });
});

app.post('/send', (req, res) => {
  const { to, text } = req.body;
  client.sendMessage(to, text);
  res.sendStatus(200);
});

app.get('/qr', (req, res) => {
  if (qrReady) {
    res.json({ qr: qrData });
  } else {
    res.status(503).json({ message: 'QR not ready' });
  }
});

async function generateReply(prompt) {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    });
    return response.data.choices[0].message.content;
  } catch (e) {
    return '(AI error)';
  }
}

client.initialize();

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
