import { getDb } from '../../lib/db';
import { createSession, setSessionCookie } from '../../lib/auth';
import { hashPassword, verifyPassword } from '../../lib/password';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { identifier, mobile, password } = req.body || {};
  const loginIdentifier = (identifier || mobile || '').trim();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const db = await getDb();
    const adminUsername = 'pete';
    const adminPassword = process.env.ADMIN_PASSWORD || 'stagadmin2025';

    const user = await db.get(
      `SELECT id, username, name, mobile, password_hash, is_admin as isAdmin
       FROM users
       WHERE mobile = ? OR username = ?`,
      [loginIdentifier, loginIdentifier.toLowerCase()]
    );

    let authenticatedUser = user;

    // Recovery path: allow configured admin password for 'pete' and sync DB hash.
    if (
      loginIdentifier.toLowerCase() === adminUsername &&
      (!authenticatedUser || !verifyPassword(password, authenticatedUser.password_hash)) &&
      password === adminPassword
    ) {
      await db.run(
        `INSERT INTO users (username, name, mobile, password_hash, is_admin)
         VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(username) DO UPDATE SET
           password_hash = excluded.password_hash,
           is_admin = 1`,
        [adminUsername, 'Pete', null, hashPassword(adminPassword)]
      );

      authenticatedUser = await db.get(
        `SELECT id, username, name, mobile, password_hash, is_admin as isAdmin
         FROM users
         WHERE username = ?`,
        [adminUsername]
      );
    }

    if (!authenticatedUser || !verifyPassword(password, authenticatedUser.password_hash)) {
      return res.status(401).json({ error: 'Invalid login' });
    }

    const token = await createSession(db, authenticatedUser.id);
    setSessionCookie(res, token);

    return res.status(200).json({
      success: true,
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        name: authenticatedUser.name,
        mobile: authenticatedUser.mobile,
        isAdmin: Boolean(authenticatedUser.isAdmin)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
