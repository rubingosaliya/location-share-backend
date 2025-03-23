const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Root works', name: 'Rubin' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test works', name: 'Rubin' });
});

module.exports = app;
