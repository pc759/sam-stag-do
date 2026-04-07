import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import { RAW_TAG_SELECT, userHasTraitorChannel } from '../../lib/userTags';

async function canAccess(db, user) {
  if (user.isAdmin) {
    return true;
  }
  const rawTags = await db.all(
    `SELECT ${RAW_TAG_SELECT}
     FROM user_tags ut
     JOIN tags t ON t.id = ut.tag_id
     WHERE ut.user_id = ?`,
    [user.id]
  );
  return userHasTraitorChannel(rawTags);
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const allowed = await canAccess(db, sessionUser);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    const posts = await db.all(
      `SELECT p.id, p.body, p.created_at as createdAt, u.name as authorName, u.id as authorId
       FROM traitor_posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 200`
    );
    return res.status(200).json({ posts });
  }

  if (req.method === 'POST') {
    const { body } = req.body || {};
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'Message is required' });
    }
    await db.run('INSERT INTO traitor_posts (user_id, body) VALUES (?, ?)', [
      sessionUser.id,
      text.slice(0, 8000)
    ]);
    return res.status(201).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
