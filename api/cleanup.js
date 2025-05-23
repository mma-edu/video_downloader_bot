const storage = require('../lib/storage');

module.exports = async (req, res) => {
  if (req.method === 'POST' && req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Running cleanup...');
    storage.cleanup();
    return res.status(200).json({ cleaned: true });
  }
  return res.status(403).end();
};