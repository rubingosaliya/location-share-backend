let locations = {};

// The function that handles both POST and GET requests for location data
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { sessionId } = req.query; // Use query params for sessionId

  if (req.method === 'POST') {
    // POST request to add location data
    const { lat, lng, name } = req.body;

    if (!locations[sessionId]) {
      locations[sessionId] = [];
    }

    locations[sessionId].push({ lat, lng, name }); // Store location with name

    console.log(`Added to session ${sessionId}:`, { lat, lng, name });

    // Clear session data after 60 minutes
    setTimeout(() => {
      delete locations[sessionId];
      console.log(`Cleared session ${sessionId}`);
    }, 3600000);

    res.status(200).send('Location added');
  } else if (req.method === 'GET') {
    // GET request to send all locations for a session
    console.log(`Sending locations for session ${sessionId}:`, locations[sessionId] || []);
    res.status(200).json({ locations: locations[sessionId] || [] });
  } else {
    // Handle unsupported HTTP methods
    res.status(405).send('Method Not Allowed');
  }
};

