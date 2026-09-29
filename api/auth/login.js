const crypto = require('node:crypto');
const { db, schema, body, passwordHash, safeEqual, setSession } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await schema(); const { email, password } = body(req);
    const result = await db().query('SELECT * FROM users WHERE email=$1', [String(email || '').trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user || user.status !== 'active' || !user.password_hash || !safeEqual(await passwordHash(String(password || ''), user.salt), user.password_hash)) return res.status(401).json({ error: 'Email or password is incorrect' });
    setSession(res, user.id);
    return res.status(200).json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch (e) { return res.status(503).json({ error: e.message || 'Login service is unavailable' }); }
};
