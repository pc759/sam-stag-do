import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';
import {
  RAW_TAG_SELECT,
  getVisibleTagsForViewer,
  computePhotoOverlay
} from '../../../lib/userTags';

function toBadgeRow(t) {
  return { id: t.id, name: t.name, icon: t.icon, badgeColor: t.badgeColor };
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const attendeeId = Number(req.query.id);
  if (!attendeeId) {
    return res.status(400).json({ error: 'Invalid attendee id' });
  }

  if (req.method === 'GET') {
    const attendee = await db.get(
      `SELECT id, username, name, mobile, is_admin as isAdmin, photo_url as photoUrl, connection, memories
       FROM users
       WHERE id = ?`,
      [attendeeId]
    );

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    const rawTags = await db.all(
      `SELECT ${RAW_TAG_SELECT}
       FROM user_tags ut
       JOIN tags t ON t.id = ut.tag_id
       WHERE ut.user_id = ?
       ORDER BY t.name ASC`,
      [attendeeId]
    );

    const isAdmin = Boolean(sessionUser.isAdmin);
    const tags = isAdmin ? rawTags.map(toBadgeRow) : getVisibleTagsForViewer(rawTags, false);
    const photoOverlay = computePhotoOverlay(rawTags);

    return res.status(200).json({ ...attendee, tags, photoOverlay });
  }

  if (req.method === 'PUT') {
    const canEdit = sessionUser.isAdmin || sessionUser.id === attendeeId;
    if (!canEdit) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, photoUrl, connection, memories } = req.body || {};
    await db.run(
      `UPDATE users
       SET name = ?, photo_url = ?, connection = ?, memories = ?
       WHERE id = ?`,
      [name || '', photoUrl || '', connection || '', memories || '', attendeeId]
    );

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
