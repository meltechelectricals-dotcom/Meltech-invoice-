const crypto = require('node:crypto');
const { db, schema, body, passwordHash, passwordValid } = require('./_lib');
module.exports = async (req,res) => {
  if(req.method!=='POST')return res.status(405).end();
  try {
    if(!process.env.ADMIN_SETUP_SECRET||!process.env.SESSION_SECRET)throw new Error('ADMIN_SETUP_SECRET and SESSION_SECRET must be configured');
    const {setupSecret,email,password,fullName}=body(req);
    const a=Buffer.from(String(setupSecret||'')),b=Buffer.from(process.env.ADMIN_SETUP_SECRET);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:'Invalid setup secret'});
    if(!passwordValid(password)||!String(email||'').includes('@')||!String(fullName||'').trim())return res.status(400).json({error:'Provide a name, valid email, and password of at least 12 characters'});
    await schema();const exists=await db().query("SELECT 1 FROM users WHERE role='admin' LIMIT 1");if(exists.rowCount)return res.status(409).json({error:'The first admin account has already been created'});
    const salt=crypto.randomBytes(16).toString('hex'),digest=await passwordHash(password,salt),out=await db().query("INSERT INTO users(id,email,full_name,role,status,salt,password_hash) VALUES($1,$2,$3,'admin','active',$4,$5) RETURNING id,email,full_name,role",[crypto.randomUUID(),String(email).trim().toLowerCase(),String(fullName).trim(),salt,digest]);
    return res.status(201).json({user:{id:out.rows[0].id,email:out.rows[0].email,fullName:out.rows[0].full_name,role:'admin'}});
  } catch(e) {return res.status(503).json({error:e.message||'Admin setup failed'});}
};
