const crypto = require('node:crypto');
const { db, schema, body, requireUser, publicUser, sendReset } = require('../_lib');
module.exports = async (req, res) => {
  try {
    await schema(); const admin = await requireUser(req,res,['admin']); if (!admin) return;
    if (req.method === 'GET') { const out = await db().query('SELECT id,email,full_name,role,status,created_at FROM users ORDER BY created_at DESC'); return res.status(200).json({ users: out.rows.map(publicUser) }); }
    if (req.method === 'POST') {
      const { email, fullName, role } = body(req), normalized = String(email||'').trim().toLowerCase();
      if (!normalized.includes('@') || !String(fullName||'').trim() || !['admin','staff','user'].includes(role)) return res.status(400).json({ error: 'Enter a name, valid email, and role' });
      const id=crypto.randomUUID();
      const out=await db().query('INSERT INTO users(id,email,full_name,role,status) VALUES($1,$2,$3,$4,\'pending\') RETURNING id,email,full_name,role,status,created_at',[id,normalized,String(fullName).trim(),role]);
      try { await sendReset(out.rows[0]); } catch(e) { await db().query('DELETE FROM users WHERE id=$1',[id]); throw e; }
      return res.status(201).json({ user: publicUser(out.rows[0]) });
    }
    if (req.method === 'PATCH') {
      const { id, role, status } = body(req);
      if (id===admin.id && status==='disabled') return res.status(400).json({ error: 'You cannot disable your own active admin account' });
      const out=await db().query('UPDATE users SET role=COALESCE($1,role),status=COALESCE($2,status) WHERE id=$3 RETURNING id,email,full_name,role,status,created_at',[['admin','staff','user'].includes(role)?role:null,['active','pending','disabled'].includes(status)?status:null,id]);
      if(!out.rows[0])return res.status(404).json({error:'Account not found'});return res.status(200).json({user:publicUser(out.rows[0])});
    }
    if (req.method === 'DELETE') { const id=body(req).id;if(id===admin.id)return res.status(400).json({error:'You cannot disable your own account'});await db().query("UPDATE users SET status='disabled' WHERE id=$1",[id]);return res.status(200).json({ok:true}); }
    return res.status(405).end();
  } catch(e) { return res.status(503).json({error:e.message||'Account management failed'}); }
};
