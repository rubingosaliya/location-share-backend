const express = require('express');
const { kv } = require('@vercel/kv');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Location Share Backend - Use /createEvent, /updateLocation, or /getLocations');
});

// Create a new session (optional)
app.get('/createEvent', async (req, res) => {
  try {
    const { duration } = req.query;
    const durationHours = parseFloat(duration);
    if (isNaN(durationHours) || durationHours <= 0 || durationHours > 24) {
      return res.status(400).send('Invalid duration: must be between 0 and 24 hours');
    }
    const sessionId = Math.random().toString(36).substr(2, 9);
    const expirationTime = Date.now() + durationHours * 3600000;
    await kv.set(`session:${sessionId}`, { expirationTime }, { ex: Math.ceil(durationHours * 3600) });
    const shareLink = `https://rubingosaliya.github.io/location-share-test/?session=${sessionId}`;
    res.json({ sessionId, shareLink, expiresAt: expirationTime });
  } catch (error) {
    console.error('Error in createEvent:', error);
    res.status(500).send('Server error');
  }
});

// Update user's location
app.post('/updateLocation', async (req, res) => {
  try {
    const { sessionId, lat, lng, userName, shareUntil, accuracy } = req.body;
    if (!userName || !lat || !lng || !shareUntil) {
      return res.status(400).send('Missing required fields');
    }
    //if (accuracy > 50) {
    //  return res.status(200).send('Location ignored due to low accuracy');
    //}

    let sessionExpiration = Infinity;
    if (sessionId) {
      const session = await kv.get(`session:${sessionId}`);
      if (!session || Date.now() > session.expirationTime) {
        return res.status(400).send('Session has expired or is invalid');
      }
      sessionExpiration = session.expirationTime;
    }

    const effectiveExpiration = Math.min(shareUntil, sessionExpiration);
    const userKey = sessionId ? `locations:${sessionId}` : `user:${userName}`;
    let locations = (await kv.get(userKey)) || [];
    locations = locations.filter(loc => loc.name !== userName);
    locations.push({ lat, lng, name: userName, active: Date.now() < effectiveExpiration });
    await kv.set(userKey, locations, { ex: Math.ceil((effectiveExpiration - Date.now()) / 1000) });
    res.send('Location added');
  } catch (error) {
    console.error('Error in updateLocation:', error);
    res.status(500).send('Server error');
  }
});

// Get all locations
app.get('/getLocations', async (req, res) => {
  try {
    const { sessionId, userName } = req.query;
    const key = sessionId ? `locations:${sessionId}` : `user:${userName}`;
    const session = sessionId ? await kv.get(`session:${sessionId}`) : null;

    if (sessionId && (!session || Date.now() > session.expirationTime)) {
      return res.status(400).send('Session has expired or is invalid');
    }

    let locations = (await kv.get(key)) || [];
    locations = locations.filter(loc => loc.active && Date.now() < (sessionId ? session.expirationTime : Infinity));
    res.json({ locations });
  } catch (error) {
    console.error('Error in getLocations:', error);
    res.status(500).send('Server error');
  }
});

module.exports = app;