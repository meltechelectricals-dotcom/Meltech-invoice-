const crypto = require('node:crypto');
const { Pool } = require('pg');

let pool;
function db() {
  if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is not configured');
  if (!pool) pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  return pool;
}

async function schema() {
  await db().query(`CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY, email text UNIQUE NOT NULL, full_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin','staff','user')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','disabled')),
    salt text, password_hash text, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db().query(`CREATE TABLE IF NOT EXISTS password_resets (
    token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL, used_at timestamptz
  )`);
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}
function passwordHash(password, salt) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (err, key) => err ? reject(err) : resolve(key.toString('hex'))));
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''), 'hex'); const y = Buffer.from(String(b || ''), 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function sessionToken(userId) {
  const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
  const payload = Buffer.from(userId + ':' + exp).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(payload).digest('base64url');
  return payload + '.' + sig;
}
function setSession(res, userId) {
  res.setHeader('Set-Cookie', 'meltech_session=' + sessionToken(userId) + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800');
}
function clearSession(res) {
  res.setHeader('Set-Cookie', 'meltech_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
}
async function sessionUser(req) {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not configured');
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('meltech_session='));
  if (!cookie) return null;
  const token = cookie.slice('meltech_session='.length).split('.');
  if (token.length !== 2) return null;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(token[0]).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token[1]))) return null;
  let payload; try { payload = Buffer.from(token[0], 'base64url').toString().split(':'); } catch { return null; }
  if (!payload[0] || Number(payload[1]) < Date.now() / 1000) return null;
  const result = await db().query('SELECT id,email,full_name,role,status FROM users WHERE id=$1', [payload[0]]);
  const user = result.rows[0];
  return user && user.status === 'active' ? user : null;
}
async function requireUser(req, res, roles) {
  const user = await sessionUser(req);
  if (!user) { res.status(401).json({ error: 'Sign in required' }); return null; }
  if (roles && !roles.includes(user.role)) { res.status(403).json({ error: 'Not authorized' }); return null; }
  return user;
}
function passwordValid(value) { return typeof value === 'string' && value.length >= 12 && value.length <= 200; }
function publicUser(row) { return { id: row.id, email: row.email, fullName: row.full_name, role: row.role, status: row.status, createdAt: row.created_at }; }
async function sendReset(user) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !process.env.APP_URL) throw new Error('Email reset is not configured');
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await db().query('INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'30 minutes\')', [tokenHash, user.id]);
  const link = process.env.APP_URL.replace(/\/$/, '') + '/?reset=' + encodeURIComponent(raw) + '&email=' + encodeURIComponent(user.email);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [user.email], subject: 'Reset your Meltech account password', text: 'Use this one-time link within 30 minutes to reset your Meltech account password:\n\n' + link })
  });
  if (!response.ok) throw new Error('Email provider rejected the reset message');
}

module.exports = { db, schema, body, passwordHash, safeEqual, setSession, clearSession, sessionUser, requireUser, passwordValid, publicUser, sendReset };
