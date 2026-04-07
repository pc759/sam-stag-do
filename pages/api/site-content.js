import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import { contentKeys, defaultContent, normalizeThemeFromStored } from '../../lib/siteContent';

export default async function handler(req, res) {
  const db = await getDb();
  const user = await getSessionUser(req, db);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.all('SELECT key, value FROM site_content');
      const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
      return res.status(200).json(normalizeThemeFromStored({ ...defaultContent, ...stored }));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    if (!user.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body || {};

    try {
      for (const key of contentKeys) {
        if (typeof payload[key] === 'string') {
          await db.run(
            `INSERT INTO site_content (key, value, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET
               value = excluded.value,
               updated_at = CURRENT_TIMESTAMP`,
            [key, payload[key]]
          );
        }
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
