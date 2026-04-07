import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';

export default async function handler(req, res) {
  const db = await getDb();
  const user = await getSessionUser(req, db);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rows = await db.all(`
      SELECT n.id, n.parent_id, n.page_id, n.label, n.url, n.sort_order,
             n.open_in_new_tab, p.slug AS page_slug
      FROM nav_items n
      LEFT JOIN pages p ON n.page_id = p.id
      WHERE n.is_visible = 1
        AND (n.page_id IS NULL OR p.is_published = 1)
      ORDER BY n.sort_order ASC, n.id ASC
    `);

    // Build nested tree: top-level items with children
    const topLevel = [];
    const childrenMap = {};

    for (const row of rows) {
      const item = {
        id: row.id,
        label: row.label,
        url: row.page_id ? `/p/${row.page_slug}` : (row.url || '/'),
        openInNewTab: !!row.open_in_new_tab,
        children: []
      };
      if (row.parent_id) {
        if (!childrenMap[row.parent_id]) childrenMap[row.parent_id] = [];
        childrenMap[row.parent_id].push(item);
      } else {
        topLevel.push(item);
      }
    }

    // Attach children to parents
    for (const item of topLevel) {
      if (childrenMap[item.id]) {
        item.children = childrenMap[item.id];
      }
    }

    return res.status(200).json(topLevel);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
