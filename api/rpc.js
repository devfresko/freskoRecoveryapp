// POST /api/rpc   body: { fn: "getAllData", args: [...] }
const { handle } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'POST only' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  try {
    const out = await handle(String(body.fn || ''), body.args);
    res.status(200).json(out === undefined ? { success: true } : out);
  } catch (e) {
    res.status(200).json({ success: false, error: e.message || String(e) });
  }
};
