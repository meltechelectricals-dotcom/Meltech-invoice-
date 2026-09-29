const crypto = require('node:crypto');
const { db, schema, body, passwordHash, passwordValid, setSession } = require('../_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await schema(); const { token, email, password } = body(req);
    if (!passwordValid(password)) return res.status(400).json({ error: 'Use a password with at least 12 characters' });
    const hash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
    const found = await db().query(`SELECT r.token_hash,r.user_id,u.email FROM password_resets r JOIN users u ON u.id=r.user_id WHERE r.token_hash=$1 AND u.email=$2 AND r.used_at IS NULL AND r.expires_at>now()`, [hash, String(email || '').trim().toLowerCase()]);
    if (!found.rows[0]) return res.status(400).json({ error: 'This reset link has expired or was already used' });
    const salt = crypto.randomBytes(16).toString('hex'), digest = await passwordHash(password, salt), client = await db().connect();
    try { await client.query('BEGIN'); await client.query('UPDATE users SET salt=$1,password_hash=$2,status=\'active\' WHERE id=$3', [salt,digest,found.rows[0].user_id]); await client.query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', [hash]); await client.query('COMMIT'); }
    catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    setSession(res, found.rows[0].user_id); return res.status(200).json({ ok: true });
  } catch (e) { return res.status(503).json({ error: e.message || 'Password reset failed' }); }
};
