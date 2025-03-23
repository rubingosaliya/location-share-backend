module.exports = (req, res) => {
  res.status(200).json({ message: 'Direct handler works', name: 'Rubin' });
};
