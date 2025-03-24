const express = require('express');
const app = express();

// Root endpoint to respond to basic GET requests
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.send('Location Share Backend is up and running!');
});

// Allow JSON data and cross-origin requests
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Request method: ${req.method}, Request URL: ${req.url}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received, responding with 200');
    return res.status(200).end();
  }

  next();
});

// Store locations in memory (temporary for testing)
let locations = {};
let sessions = {}; // Store session details, including expiration times

// POST endpoint to create a new event
app.get('/createEvent', (req, res) => {
  const { duration } = req.query;
  console.log(`CreateEvent requested with duration: ${duration}`);

  if (!duration || duration <= 0 || duration > 6) {
    console.log('Invalid duration provided');
    return res.status(400).send('Invalid duration. Please provide a duration between 1 and 6 hours.');
  }

  const sessionId = generateSessionId();
  const expirationTime = Date.now() + duration * 3600000; // Set expiration time for session
  sessions[sessionId] = { expirationTime };
  console.log(`Session created: ${sessionId}, Expiration: ${expirationTime}`);

  res.json({ sessionId });
});

// POST endpoint to receive a location with name
app.post('/updateLocation', (req, res) => {
  const { sessionId, lat, lng, userName, shareUntil, accuracy } = req.body;
  console.log(`UpdateLocation requested with data: ${JSON.stringify(req.body)}`);

  // Check if session exists and is still active
  if (!sessions[sessionId] || Date.now() > sessions[sessionId].expirationTime) {
    console.log(`Session ${sessionId} expired or invalid`);
    return res.status(400).send('Session has expired or is invalid.');
  }

  if (!locations[sessionId]) {
    locations[sessionId] = [];
    console.log(`Session ${sessionId} not found, initializing empty locations array`);
  }

  // Check location accuracy before adding (accuracy > 50m ignored)
  if (accuracy > 50) {
    console.log(`Location ignored due to low accuracy: ${lat}, ${lng}`);
    return res.status(200).send('Location ignored due to low accuracy');
  }

  locations[sessionId].push({ lat, lng, name: userName, active: Date.now() < shareUntil });
  console.log(`Added location to session ${sessionId}: ${lat}, ${lng}, ${userName}`);

  res.send('Location added');
});

// GET endpoint to send all locations for a session
app.get('/getLocations', (req, res) => {
  const { sessionId } = req.query;
  console.log(`GetLocations requested for sessionId: ${sessionId}`);

  // Check if session exists and is still active
  if (!sessions[sessionId] || Date.now() > sessions[sessionId].expirationTime) {
    console.log(`Session ${sessionId} expired or invalid`);
    return res.status(400).send('Session has expired or is invalid.');
  }

  console.log(`Sending locations for session ${sessionId}:`, locations[sessionId] || []);
  res.json({ locations: locations[sessionId] || [] });
});

// POST endpoint to stop sharing location
app.post('/stopSharing', (req, res) => {
  const { sessionId } = req.query;
  console.log(`StopSharing requested for sessionId: ${sessionId}`);

  if (!sessions[sessionId]) {
    console.log(`Session ${sessionId} not found`);
    return res.status(400).send('Session not found');
  }

  // Mark all users in the session as inactive (stop sharing)
  locations[sessionId].forEach(userLocation => {
    userLocation.active = false;
  });

  console.log(`Location sharing stopped for session ${sessionId}`);
  res.send('Location sharing stopped');
});

// Helper function to generate session ID
function generateSessionId() {
  const sessionId = Math.random().toString(36).substr(2, 9); // Random session ID
  console.log(`Generated new session ID: ${sessionId}`);
  return sessionId;
}

// Export the handler for Vercel serverless function
module.exports = (req, res) => {
  console.log(`Incoming request to: ${req.url}`);
  app(req, res);
};

