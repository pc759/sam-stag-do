import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const db = await getDb();
  const user = await getSessionUser(req, db);

  if (!user || !user.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.all('SELECT * FROM stories ORDER BY created_at DESC');
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query.id);

    if (!id) {
      return res.status(400).json({ error: 'Invalid story id' });
    }

    try {
      await db.run('DELETE FROM stories WHERE id = ?', [id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
