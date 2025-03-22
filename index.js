const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Force fresh redeploy
let locations = {};

app.post('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { lat, lng, name } = req.body;
  if (!locations[sessionId]) {
    locations[sessionId] = [];
  }
  locations[sessionId].push({ lat, lng, name });
  console.log(`Added to ${sessionId}:`, { lat, lng, name });
  setTimeout(() => {
    delete locations[sessionId];
    console.log(`Cleared session ${sessionId}`);
  }, 3600000);
  res.send('Location added');
});

app.get('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log(`Sending for ${sessionId}:`, locations[sessionId] || []);
  res.json({ locations: locations[sessionId] || [] });
});

module.exports = app;

