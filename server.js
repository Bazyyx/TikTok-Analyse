
const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const WEBHOOK_URL = 'https://script.google.com/macros/s/DEINE_WEBHOOK_URL/exec';


const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

async function fetchTikTokStats(username) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(`https://www.tiktok.com/@${username}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  const stats = await page.evaluate(() => {
    const e = document.querySelectorAll('strong[data-e2e]');
    return {
      followers: e[0]?.innerText || '0',
      likes: e[1]?.innerText || '0',
      videos: e[2]?.innerText || '0'
    };
  });

  await browser.close();
  return stats;
}

async function sendToWebhook(data) {
  await axios.post(WEBHOOK_URL, data);
}

app.post('/analyze', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Kein TikTok-Nutzername angegeben.' });

  try {
    const stats = await fetchTikTokStats(username);
    await sendToWebhook(stats);
    res.json(stats);
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Analyse oder Webhook fehlgeschlagen.' });
  }
});

app.listen(3000, () => {
  console.log('✅ Server läuft auf http://localhost:3000');
});
