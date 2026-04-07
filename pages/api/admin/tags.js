import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser || !sessionUser.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const tags = await db.all(
      `SELECT id, name, icon, badge_color as badgeColor,
        COALESCE(hidden_from_attendees, 0) as hiddenFromAttendees,
        photo_overlay as photoOverlay,
        COALESCE(traitor_channel, 0) as traitorChannel
       FROM tags
       ORDER BY name ASC`
    );
    return res.status(200).json(tags);
  }

  if (req.method === 'POST') {
    const { name, icon, badgeColor, hiddenFromAttendees, photoOverlay, traitorChannel } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    const hidden = hiddenFromAttendees ? 1 : 0;
    const traitor = traitorChannel ? 1 : 0;
    const overlay = photoOverlay === 'murdered' ? 'murdered' : null;
    try {
      await db.run(
        `INSERT INTO tags (name, icon, badge_color, hidden_from_attendees, photo_overlay, traitor_channel)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          (icon || '🏷️').trim(),
          (badgeColor || '#374151').trim(),
          hidden,
          overlay,
          traitor
        ]
      );
      return res.status(201).json({ success: true });
    } catch (err) {
      return res.status(400).json({ error: 'Tag already exists' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, hiddenFromAttendees, photoOverlay, traitorChannel } = req.body || {};
    const tagId = Number(id);
    if (!tagId) {
      return res.status(400).json({ error: 'Invalid tag id' });
    }
    const row = await db.get('SELECT id FROM tags WHERE id = ?', [tagId]);
    if (!row) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const updates = [];
    const params = [];
    if (typeof hiddenFromAttendees === 'boolean') {
      updates.push('hidden_from_attendees = ?');
      params.push(hiddenFromAttendees ? 1 : 0);
    }
    if (photoOverlay === 'murdered' || photoOverlay === null || photoOverlay === '' || photoOverlay === 'none') {
      updates.push('photo_overlay = ?');
      params.push(photoOverlay === 'murdered' ? 'murdered' : null);
    }
    if (typeof traitorChannel === 'boolean') {
      updates.push('traitor_channel = ?');
      params.push(traitorChannel ? 1 : 0);
    }
    if (!updates.length) {
      return res.status(400).json({ error: 'No updates' });
    }
    params.push(tagId);
    await db.run(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`, params);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid tag id' });
    }
    await db.run('DELETE FROM tags WHERE id = ?', [id]);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
