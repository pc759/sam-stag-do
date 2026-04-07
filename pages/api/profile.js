import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import {
  RAW_TAG_SELECT,
  getVisibleTagsForViewer,
  computePhotoOverlay
} from '../../lib/userTags';
import { getUserMoneySummary } from '../../lib/expenses';

function toBadgeRow(t) {
  return { id: t.id, name: t.name, icon: t.icon, badgeColor: t.badgeColor };
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const [rawTags, money] = await Promise.all([
      db.all(
        `SELECT ${RAW_TAG_SELECT}
         FROM user_tags ut
         JOIN tags t ON t.id = ut.tag_id
         WHERE ut.user_id = ?
         ORDER BY t.name ASC`,
        [sessionUser.id]
      ),
      getUserMoneySummary(db, sessionUser.id)
    ]);

    const isAdmin = Boolean(sessionUser.isAdmin);
    const tags = isAdmin ? rawTags.map(toBadgeRow) : getVisibleTagsForViewer(rawTags, false);
    const photoOverlay = computePhotoOverlay(rawTags);

    return res.status(200).json({
      ...sessionUser,
      tags,
      photoOverlay,
      money
    });
  }

  if (req.method === 'PUT') {
    const { name, photoUrl, connection, memories } = req.body || {};
    await db.run(
      `UPDATE users
       SET name = ?, photo_url = ?, connection = ?, memories = ?
       WHERE id = ?`,
      [name || sessionUser.name, photoUrl || '', connection || '', memories || '', sessionUser.id]
    );
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
