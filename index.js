const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const cors = require('cors');

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

let events = {};  // Stores event details
let locations = {};  // Stores live locations

// Create Event
app.get('/createEvent', (req, res) => {
    const duration = parseInt(req.query.duration);
    if (!duration || duration > 6) return res.status(400).json({ error: "Invalid duration" });

    const sessionId = `event_${Date.now()}`;
    events[sessionId] = {
        expiresAt: Date.now() + duration * 3600000, // Convert hours to ms
        owner: null
    };

    res.json({ sessionId });
});

// WebSocket Connection for Live Updates
io.on('connection', (socket) => {
    let sessionId;
    let userId = socket.id;

    socket.on('joinEvent', (data) => {
        sessionId = data.sessionId;
        if (!events[sessionId] || Date.now() > events[sessionId].expiresAt) {
            return socket.emit('error', 'Event expired or invalid');
        }

        locations[userId] = { ...data, active: true };
        io.to(sessionId).emit('updateLocations', Object.values(locations));
        socket.join(sessionId);
    });

    socket.on('updateLocation', (data) => {
        if (locations[userId]) {
            locations[userId] = { ...locations[userId], lat: data.lat, lng: data.lng, active: true };
            io.to(sessionId).emit('updateLocations', Object.values(locations));
        }
    });

    socket.on('stopSharing', () => {
        if (locations[userId]) {
            locations[userId].active = false;
            io.to(sessionId).emit('updateLocations', Object.values(locations));
        }
    });

    socket.on('disconnect', () => {
        if (locations[userId]) {
            locations[userId].active = false;
            io.to(sessionId).emit('updateLocations', Object.values(locations));
        }
    });
});

// Start Server
http.listen(3000, () => console.log('Server running on port 3000'));

