import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';

export default async function handler(req, res) {
  const db = await getDb();
  const user = await getSessionUser(req, db);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.all('SELECT * FROM stories ORDER BY created_at DESC');
      return res.status(200).json(rows || []);
    } catch (err) {
      console.error('GET Error:', err);
      return res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'POST') {
    const { author, story } = req.body;
    const finalAuthor = (author || '').trim() || user.name;

    if (!finalAuthor || !story) {
      return res.status(400).json({ error: 'Missing author or story' });
    }

    try {
      const result = await db.run(
        'INSERT INTO stories (author, story) VALUES (?, ?)',
        [finalAuthor, story]
      );
      return res.status(201).json({ success: true, id: result.lastID });
    } catch (err) {
      console.error('POST Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}