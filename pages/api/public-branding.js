import { getDb } from '../../lib/db';
import { defaultContent, pickPublicBranding } from '../../lib/siteContent';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const rows = await db.all('SELECT key, value FROM site_content');
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const merged = { ...defaultContent, ...stored };
    return res.status(200).json(pickPublicBranding(merged));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
