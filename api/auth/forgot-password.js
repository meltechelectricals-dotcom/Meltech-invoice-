const { db, schema, body, sendReset } = require('../_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await schema(); const email = String(body(req).email || '').trim().toLowerCase();
    const result = await db().query('SELECT id,email FROM users WHERE email=$1 AND status IN (\'active\',\'pending\')', [email]);
    if (result.rows[0]) await sendReset(result.rows[0]);
    return res.status(200).json({ ok: true, message: 'If that account exists, a reset link has been sent.' });
  } catch (e) { return res.status(503).json({ error: e.message || 'Password reset is unavailable' }); }
};
