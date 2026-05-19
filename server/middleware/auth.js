module.exports = function auth(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next(); // auth disabled when env var not set
  const header = req.headers['x-api-key'];
  if (header !== apiKey) return res.status(401).json({ error: 'Não autorizado' });
  next();
};
