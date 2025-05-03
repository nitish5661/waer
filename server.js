// server.js
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const OpenAI = require('openai');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

// Set up OpenAI client (v4.x+)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox'],
  },
});

// Serve static files from 'public' folder
app.use(express.static('public'));
app.use(express.json()); // To handle JSON requests

// Endpoint to get QR code for WhatsApp login
app.get('/qr', (req, res) => {
  client.on('qr', async (qr) => {
    const qrImage = await qrcode.toDataURL(qr);
    res.json({ qrImage });
  });
});

// Endpoint to get AI reply
app.post('/ai-reply', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }],
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI response failed' });
  }
});

// Endpoint to send a message via WhatsApp
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;

  try {
    const chat = await client.getChatById(`${number}@c.us`);
    await chat.sendMessage(message);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', details: err });
  }
});

// Start WhatsApp client
client.initialize();

client.on('ready', () => {
  console.log('WhatsApp client is ready');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
