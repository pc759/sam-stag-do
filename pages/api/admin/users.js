import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';
import { hashPassword } from '../../../lib/password';

function normalizeMobile(value) {
  return (value || '').replace(/\s+/g, '');
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser || !sessionUser.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const users = await db.all(
      `SELECT id, username, name, mobile, is_admin as isAdmin, photo_url as photoUrl,
              connection, memories, created_at as createdAt
       FROM users
       ORDER BY is_admin DESC, name ASC`
    );
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const { name, mobile, password } = req.body || {};
    const cleanMobile = normalizeMobile(mobile);

    if (!name || !cleanMobile || !password) {
      return res.status(400).json({ error: 'Name, mobile and password are required' });
    }

    try {
      await db.run(
        `INSERT INTO users (name, mobile, password_hash, is_admin)
         VALUES (?, ?, ?, 0)`,
        [name.trim(), cleanMobile, hashPassword(password)]
      );
      return res.status(201).json({ success: true });
    } catch (err) {
      return res.status(400).json({ error: 'Could not create user. Mobile may already exist.' });
    }
  }

  if (req.method === 'PATCH') {
    const { userId, name, mobile, password } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const target = await db.get('SELECT id, is_admin as isAdmin FROM users WHERE id = ?', [userId]);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const params = [];

    if (typeof name === 'string' && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (typeof mobile === 'string' && mobile.trim()) {
      updates.push('mobile = ?');
      params.push(normalizeMobile(mobile));
    }

    if (typeof password === 'string' && password.trim()) {
      updates.push('password_hash = ?');
      params.push(hashPassword(password.trim()));
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(userId);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
