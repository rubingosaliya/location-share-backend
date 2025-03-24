const express = require('express');
const { kv } = require('@vercel/kv');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  console.log(`Request method: ${req.method}, Request URL: ${req.url}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received, responding with 200');
    return res.status(200).end();
  }
  next();
});

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.send('Location Share Backend is up and running!');
});

app.get('/createEvent', async (req, res) => {
  const { duration } = req.query;
  console.log(`CreateEvent requested with duration: ${duration}`);
  if (!duration || duration <= 0 || duration > 6) {
    console.log('Invalid duration provided');
    return res.status(400).send('Invalid duration. Please provide a duration between 1 and 6 hours.');
  }
  const sessionId = generateSessionId();
  const expirationTime = Date.now() + duration * 3600000;
  await kv.set(`session:${sessionId}`, { expirationTime }, { ex: duration * 3600 });
  console.log(`Session created: ${sessionId}, Expiration: ${expirationTime}`);
  res.json({ sessionId });
});

app.post('/updateLocation', async (req, res) => {
  const { sessionId, lat, lng, userName, shareUntil, accuracy } = req.body;
  console.log(`UpdateLocation requested with data: ${JSON.stringify(req.body)}`);
  const session = await kv.get(`session:${sessionId}`);
  if (!session || Date.now() > session.expirationTime) {
    console.log(`Session ${sessionId} expired or invalid`);
    return res.status(400).send('Session has expired or is invalid.');
  }
  if (accuracy > 50) {
    console.log(`Location ignored due to low accuracy: ${lat}, ${lng}`);
    return res.status(200).send('Location ignored due to low accuracy');
  }
  let sessionLocations = (await kv.get(`locations:${sessionId}`)) || [];
  sessionLocations.push({ lat, lng, name: userName, active: Date.now() < shareUntil });
  await kv.set(`locations:${sessionId}`, sessionLocations, { ex: 3600 * 6 });
  console.log(`Added location to session ${sessionId}: ${lat}, ${lng}, ${userName}`);
  res.send('Location added');
});

app.get('/getLocations', async (req, res) => {
  const { sessionId } = req.query;
  console.log(`GetLocations requested for sessionId: ${sessionId}`);
  const session = await kv.get(`session:${sessionId}`);
  if (!session || Date.now() > session.expirationTime) {
    console.log(`Session ${sessionId} expired or invalid`);
    return res.status(400).send('Session has expired or is invalid.');
  }
  const sessionLocations = (await kv.get(`locations:${sessionId}`)) || [];
  console.log(`Sending locations for session ${sessionId}:`, sessionLocations);
  res.json({ locations: sessionLocations });
});

app.post('/stopSharing', async (req, res) => {
  const { sessionId } = req.query;
  console.log(`StopSharing requested for sessionId: ${sessionId}`);
  const session = await kv.get(`session:${sessionId}`);
  if (!session) {
    console.log(`Session ${sessionId} not found`);
    return res.status(400).send('Session not found');
  }
  let sessionLocations = (await kv.get(`locations:${sessionId}`)) || [];
  sessionLocations.forEach(loc => (loc.active = false));
  await kv.set(`locations:${sessionId}`, sessionLocations, { ex: 3600 * 6 });
  console.log(`Location sharing stopped for session ${sessionId}`);
  res.send('Location sharing stopped');
});

function generateSessionId() {
  const sessionId = Math.random().toString(36).substr(2, 9);
  console.log(`Generated new session ID: ${sessionId}`);
  return sessionId;
}

module.exports = app;
// Redeploy with KV env vars
