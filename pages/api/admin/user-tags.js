import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser || !sessionUser.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, tagId, enabled } = req.body || {};
  if (!userId || !tagId) {
    return res.status(400).json({ error: 'userId and tagId are required' });
  }

  if (enabled) {
    await db.run(`INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)`, [userId, tagId]);
  } else {
    await db.run(`DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?`, [userId, tagId]);
  }

  return res.status(200).json({ success: true });
}
