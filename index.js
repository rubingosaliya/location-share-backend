const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

let locations = {};

app.post('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { lat, lng, name } = req.body;
  console.log('Received:', req.body);
  if (!locations[sessionId]) {
    locations[sessionId] = [];
  }
  // Hardcode name for testing
  locations[sessionId].push({ lat, lng, name: name || 'ForcedName' });
  console.log('Stored:', locations[sessionId]);
  res.send('Location added');
});

app.get('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('Returning:', locations[sessionId] || []);
  res.json({ locations: locations[sessionId] || [] });
});

module.exports = app;
