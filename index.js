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

app.get('/', (req, res) => {
    res.send('Location Share Backend - Use /createEvent, /updateLocation, or /getLocations');
});

app.get('/createEvent', async (req, res) => {
    try {
        const { duration } = req.query;
        const durationHours = parseFloat(duration);
        if (isNaN(durationHours) || durationHours <= 0 || durationHours > 24) {
            return res.status(400).send('Invalid duration: must be between 0 and 24 hours');
        }
        const sessionId = Math.random().toString(36).substr(2, 9);
        const expirationTime = Date.now() + durationHours * 3600000;
        const expiresInSeconds = Math.ceil(durationHours * 3600);
        if (expiresInSeconds <= 0) {
            throw new Error('Calculated expiration time is invalid');
        }
        await kv.set(
            `session:${sessionId}`,
            { expirationTime },
            { ex: expiresInSeconds }
        );
        const shareLink = `https://rubingosaliya.github.io/location-share-test/?session=${sessionId}`;
        console.log(`Created session: ${sessionId}, expires: ${new Date(expirationTime)}`);
        res.json({ sessionId, shareLink, expiresAt: expirationTime });
    } catch (error) {
        console.error('Error in createEvent:', error.message, error.stack);
        res.status(500).send(`Server error: ${error.message}`);
    }
});

app.post('/updateLocation', async (req, res) => {
    try {
        const { sessionId, lat, lng, userName, shareUntil, shareStart, clientId, accuracy } = req.body;
        if (!userName || !shareUntil || !clientId) {
            return res.status(400).send('Missing required fields: userName, shareUntil, clientId');
        }
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return res.status(400).send('Invalid location data: lat and lng must be numbers');
        }

        let sessionExpiration = Infinity;
        if (sessionId) {
            const session = await kv.get(`session:${sessionId}`);
            if (!session || Date.now() > session.expirationTime) {
                return res.status(400).send('Session has expired or is invalid');
            }
            if (!session.creatorName) {
                session.creatorName = userName;
                await kv.set(`session:${sessionId}`, session, {
                    ex: Math.ceil((session.expirationTime - Date.now()) / 1000)
                });
            }
            sessionExpiration = session.expirationTime;
        }

        const effectiveExpiration = Math.min(shareUntil, sessionExpiration);
        const userKey = sessionId ? `locations:${sessionId}` : `user:${userName}`;
        let locations = (await kv.get(userKey)) || [];
        let userLoc = locations.find(loc => loc.name === userName);
        const color = userLoc ? userLoc.color : userName === (await kv.get(`session:${sessionId}`))?.creatorName ? '#FF0000' : getColorForUser(userName);
        const history = userLoc && userLoc.history ? userLoc.history : [];
        if (Date.now() < effectiveExpiration) {
            history.push({ lat, lng, timestamp: Date.now() });
        }
        locations = locations.filter(loc => loc.name !== userName);
        locations.push({
            lat: Date.now() < effectiveExpiration ? lat : userLoc ? userLoc.lat : lat,
            lng: Date.now() < effectiveExpiration ? lng : userLoc ? userLoc.lng : lng,
            name: userName,
            active: Date.now() < effectiveExpiration,
            shareStart: shareStart || Date.now(),
            shareUntil: effectiveExpiration,
            color,
            history
        });
        await kv.set(userKey, locations, {
            ex: Math.ceil((sessionExpiration - Date.now()) / 1000)
        });

        const clientKey = `session:${sessionId}:client:${clientId}`;
        await kv.set(clientKey, { userName, shareUntil }, {
            ex: Math.ceil((effectiveExpiration - Date.now()) / 1000)
        });

        console.log(`Updated location for ${userName} in session ${sessionId || 'no-session'}`);
        res.send('Location added');
    } catch (error) {
        console.error('Error in updateLocation:', error.message, error.stack);
        res.status(500).send(`Server error: ${error.message}`);
    }
});

function getColorForUser(userName) {
    const colors = ['#0000FF', '#00FF00', '#800080', '#FFA500', '#00FFFF'];
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
        hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

app.get('/getLocations', async (req, res) => {
    try {
        const { sessionId, userName } = req.query;
        const key = sessionId ? `locations:${sessionId}` : `user:${userName}`;
        const session = sessionId ? await kv.get(`session:${sessionId}`) : null;

        if (sessionId && (!session || Date.now() > session.expirationTime)) {
            return res.status(400).send('Session has expired or is invalid');
        }

        let locations = (await kv.get(key)) || [];
        console.log(`Fetched locations for ${sessionId || userName}:`, locations.length);
        res.json({ locations });
    } catch (error) {
        console.error('Error in getLocations:', error.message, error.stack);
        res.status(500).send(`Server error: ${error.message}`);
    }
});

app.get('/getSession', async (req, res) => {
    try {
        const { sessionId, clientId } = req.query;
        if (!sessionId) {
            return res.status(400).send('Missing sessionId');
        }
        const session = await kv.get(`session:${sessionId}`);
        if (!session || Date.now() > session.expirationTime) {
            return res.status(410).send('Session expired or invalid');
        }
        let clientData = {};
        if (clientId) {
            const clientKey = `session:${sessionId}:client:${clientId}`;
            clientData = (await kv.get(clientKey)) || {};
        }
        console.log(`Fetched session ${sessionId} for client ${clientId}`);
        res.json({ creatorName: session.creatorName || 'Anonymous', expirationTime: session.expirationTime, ...clientData });
    } catch (error) {
        console.error('Error in getSession:', error.message, error.stack);
        res.status(500).send(`Server error: ${error.message}`);
    }
});

module.exports = app;