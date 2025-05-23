const storage = require('../lib/storage');

module.exports = async (req, res) => {
  // Vercel auto-adds this header for cron jobs
  if (req.method === 'POST' && req.headers['x-vercel-verify']) {
    storage.cleanup();
    return res.json({ cleaned: true });
  }
  return res.status(403).end();
};