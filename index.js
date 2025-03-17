const express = require('express');
const app = express();

// Allow JSON data and cross-origin requests (so your frontend can connect)
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Store locations in memory (temporary for testing)
let locations = {};

// POST endpoint to receive a location
app.post('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { lat, lng } = req.body;
  if (!locations[sessionId]) {
    locations[sessionId] = [];
  }
  locations[sessionId].push({ lat, lng });
  // Clear after 60 minutes (3600000 milliseconds)
  setTimeout(() => {
    delete locations[sessionId];
  }, 3600000);
  res.send('Location added');
});

// GET endpoint to send all locations for a session
app.get('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  res.json({ locations: locations[sessionId] || [] });
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});