const { sessionUser } = require('../_lib');
module.exports = async (req, res) => {
  try { const user = await sessionUser(req); return res.status(200).json({ user: user ? { id: user.id, email: user.email, fullName: user.full_name, role: user.role } : null }); }
  catch (e) { return res.status(503).json({ error: e.message || 'Account service is unavailable' }); }
};
