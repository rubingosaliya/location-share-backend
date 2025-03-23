let locations = {};

module.exports = (req, res) => {
  const { method, url } = req;
  const sessionId = url.split('/locations/')[1] || '';

  if (method === 'POST' && url.includes('/locations/')) {
    const { lat, lng, name } = req.body || {};
    if (!locations[sessionId]) {
      locations[sessionId] = [];
    }
    locations[sessionId].push({ lat, lng, name: name || 'Unnamed' });
    res.status(200).send('Location added');
    return;
  }

  if (method === 'GET' && url.includes('/locations/')) {
    res.status(200).json({ locations: locations[sessionId] || [] });
    return;
  }

  res.status(404).send('Not Found');
};
