// GET/POST /api/sync?secret=...   -> rebuild the Firestore snapshot now.
// Called by Apps Script (sheet-edit trigger + 5-minute safety trigger).
const { runSync, store } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const given = (req.query && req.query.secret) || req.headers['x-sync-secret'];
  if (!process.env.SYNC_SECRET || given !== process.env.SYNC_SECRET) {
    res.status(401).json({ ok: false, error: 'Unauthorized' }); return;
  }
  try {
    await store.markDirty();
    const r = await runSync();
    res.status(200).json({ ok: true, result: r });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
  }
};
