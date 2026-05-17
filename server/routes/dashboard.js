const router = require('express').Router();
const { getDashboardStats } = require('../../src/db');

router.get('/', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
