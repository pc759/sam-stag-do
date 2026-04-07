import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import {
  RAW_TAG_SELECT,
  getVisibleTagsForViewer,
  computePhotoOverlay
} from '../../lib/userTags';

function toBadgeRow(t) {
  return { id: t.id, name: t.name, icon: t.icon, badgeColor: t.badgeColor };
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const users = await db.all(
    `SELECT id, name, mobile, photo_url as photoUrl, connection, memories
     FROM users
     WHERE is_admin = 0
     ORDER BY name ASC`
  );

  const tagRows = await db.all(
    `SELECT ut.user_id as userId, ${RAW_TAG_SELECT}
     FROM user_tags ut
     JOIN tags t ON t.id = ut.tag_id`
  );

  const rawByUser = {};
  for (const row of tagRows) {
    const { userId, ...raw } = row;
    if (!rawByUser[userId]) {
      rawByUser[userId] = [];
    }
    rawByUser[userId].push(raw);
  }

  const isAdmin = Boolean(sessionUser.isAdmin);

  return res.status(200).json(
    users.map((user) => {
      const raw = rawByUser[user.id] || [];
      const tags = isAdmin
        ? raw.map(toBadgeRow)
        : getVisibleTagsForViewer(raw, false);
      return {
        ...user,
        tags,
        photoOverlay: computePhotoOverlay(raw)
      };
    })
  );
}
