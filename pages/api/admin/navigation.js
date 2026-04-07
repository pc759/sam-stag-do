import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

function toCamel(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    pageId: row.page_id,
    label: row.label,
    url: row.url || '',
    sortOrder: row.sort_order,
    isVisible: !!row.is_visible,
    openInNewTab: !!row.open_in_new_tab,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // joined page fields (may be null)
    pageTitle: row.page_title || null,
    pageSlug: row.page_slug || null,
    pagePublished: row.page_published != null ? !!row.page_published : null
  };
}

export default async function handler(req, res) {
  const db = await getDb();
  const user = await getSessionUser(req, db);

  if (!user || !user.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await db.all(`
        SELECT n.*, p.title AS page_title, p.slug AS page_slug, p.is_published AS page_published
        FROM nav_items n
        LEFT JOIN pages p ON n.page_id = p.id
        ORDER BY n.sort_order ASC, n.id ASC
      `);
      return res.status(200).json(rows.map(toCamel));
    }

    if (req.method === 'POST') {
      const { label, pageId, url, parentId, sortOrder, isVisible, openInNewTab } = req.body || {};
      if (!label) {
        return res.status(400).json({ error: 'Label is required' });
      }
      const result = await db.run(
        `INSERT INTO nav_items (label, page_id, url, parent_id, sort_order, is_visible, open_in_new_tab)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          label,
          pageId || null,
          url || '',
          parentId || null,
          sortOrder || 0,
          isVisible !== false ? 1 : 0,
          openInNewTab ? 1 : 0
        ]
      );
      const row = await db.get(`
        SELECT n.*, p.title AS page_title, p.slug AS page_slug, p.is_published AS page_published
        FROM nav_items n LEFT JOIN pages p ON n.page_id = p.id
        WHERE n.id = ?
      `, [result.lastID]);
      return res.status(201).json(toCamel(row));
    }

    if (req.method === 'PUT') {
      const { id, label, pageId, url, parentId, sortOrder, isVisible, openInNewTab } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      const sets = [];
      const params = [];
      if (label !== undefined) { sets.push('label = ?'); params.push(label); }
      if (pageId !== undefined) { sets.push('page_id = ?'); params.push(pageId || null); }
      if (url !== undefined) { sets.push('url = ?'); params.push(url); }
      if (parentId !== undefined) { sets.push('parent_id = ?'); params.push(parentId || null); }
      if (sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(sortOrder); }
      if (isVisible !== undefined) { sets.push('is_visible = ?'); params.push(isVisible ? 1 : 0); }
      if (openInNewTab !== undefined) { sets.push('open_in_new_tab = ?'); params.push(openInNewTab ? 1 : 0); }
      if (sets.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      sets.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      await db.run(`UPDATE nav_items SET ${sets.join(', ')} WHERE id = ?`, params);
      const row = await db.get(`
        SELECT n.*, p.title AS page_title, p.slug AS page_slug, p.is_published AS page_published
        FROM nav_items n LEFT JOIN pages p ON n.page_id = p.id
        WHERE n.id = ?
      `, [id]);
      return res.status(200).json(toCamel(row));
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' });
      }
      await db.run('DELETE FROM nav_items WHERE id = ?', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
