const express = require('express');
const app = express();

// Root endpoint to respond to basic GET requests
app.get('/', (req, res) => {
  res.send('Location Share Backend is up and running!');
});

// Allow JSON data and cross-origin requests
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Store locations in memory (temporary for testing)
let locations = {};

// POST endpoint to receive a location with name
app.post('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { lat, lng, name } = req.body; // Add name here
  if (!locations[sessionId]) {
    locations[sessionId] = [];
  }
  locations[sessionId].push({ lat, lng, name }); // Store name
  console.log(`Added to ${sessionId}:`, { lat, lng, name }); // Debug log
  // Clear after 60 minutes (3600000 milliseconds)
  setTimeout(() => {
    delete locations[sessionId];
    console.log(`Cleared session ${sessionId}`);
  }, 3600000);
  res.send('Location added');
});

// GET endpoint to send all locations for a session
app.get('/locations/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log(`Sending for ${sessionId}:`, locations[sessionId] || []); // Debug log
  res.json({ locations: locations[sessionId] || [] });
});

// Export the handler for Vercel serverless function
module.exports = (req, res) => {
  app(req, res);
};
