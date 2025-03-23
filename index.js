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
  console.log('Raw body:', req.body);
  const { lat, lng, name } = req.body;
  if (!locations[sessionId]) {
    locations[sessionId] = [];
  }
  const loc = { lat, lng, name: name || 'ForcedName', debug: 'POST worked' };
  locations[sessionId].push(loc);
  console.log('Stored:', locations[sessionId]);
  res.send('Location added');
});

app.get('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('Returning:', locations[sessionId] || []);
  res.json({ locations: locations[sessionId] || [] });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    message: 'Debug route active',
    code: 'Latest with name handling',
    locations: locations
  });
});

module.exports = app;
