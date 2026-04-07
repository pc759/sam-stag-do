import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import { RAW_TAG_SELECT, userHasTraitorChannel } from '../../lib/userTags';

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const user = await getSessionUser(req, db);
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    const rawTags = await db.all(
      `SELECT ${RAW_TAG_SELECT}
       FROM user_tags ut
       JOIN tags t ON t.id = ut.tag_id
       WHERE ut.user_id = ?`,
      [user.id]
    );

    const traitorChannelAccess = user.isAdmin || userHasTraitorChannel(rawTags);

    return res.status(200).json({
      authenticated: true,
      user: { ...user, traitorChannelAccess }
    });
  } catch (err) {
    return res.status(500).json({ authenticated: false, error: err.message });
  }
}
