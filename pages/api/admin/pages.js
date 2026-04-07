import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toCamel(page) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    icon: page.icon,
    subtitle: page.subtitle,
    body: page.body,
    showInNav: !!page.show_in_nav,
    sortOrder: page.sort_order,
    isPublished: !!page.is_published,
    showOnHomepage: !!page.show_on_homepage,
    homepageOrder: page.homepage_order,
    gridSpan: page.grid_span,
    createdAt: page.created_at,
    updatedAt: page.updated_at
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
      const pages = await db.all('SELECT * FROM pages ORDER BY sort_order ASC');
      return res.status(200).json(pages.map(toCamel));
    }

    if (req.method === 'POST') {
      const { title, slug, icon, subtitle, body, showInNav, sortOrder, isPublished, showOnHomepage, homepageOrder, gridSpan } = req.body || {};
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      const finalSlug = (slug && slug.trim()) ? slugify(slug) : slugify(title);
      const result = await db.run(
        `INSERT INTO pages (title, slug, icon, subtitle, body, show_in_nav, sort_order, is_published, show_on_homepage, homepage_order, grid_span)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          finalSlug,
          icon || '',
          subtitle || '',
          body || '',
          showInNav !== false ? 1 : 0,
          sortOrder || 0,
          isPublished ? 1 : 0,
          showOnHomepage ? 1 : 0,
          homepageOrder || 0,
          gridSpan || 4
        ]
      );
      const page = await db.get('SELECT * FROM pages WHERE id = ?', [result.lastID]);
      return res.status(201).json(toCamel(page));
    }

    if (req.method === 'PUT') {
      const { id, title, slug, icon, subtitle, body, showInNav, sortOrder, isPublished, showOnHomepage, homepageOrder, gridSpan } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      const sets = [];
      const params = [];
      if (title !== undefined) { sets.push('title = ?'); params.push(title); }
      if (slug !== undefined) { sets.push('slug = ?'); params.push(slugify(slug)); }
      if (icon !== undefined) { sets.push('icon = ?'); params.push(icon); }
      if (subtitle !== undefined) { sets.push('subtitle = ?'); params.push(subtitle); }
      if (body !== undefined) { sets.push('body = ?'); params.push(body); }
      if (showInNav !== undefined) { sets.push('show_in_nav = ?'); params.push(showInNav ? 1 : 0); }
      if (sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(sortOrder); }
      if (isPublished !== undefined) { sets.push('is_published = ?'); params.push(isPublished ? 1 : 0); }
      if (showOnHomepage !== undefined) { sets.push('show_on_homepage = ?'); params.push(showOnHomepage ? 1 : 0); }
      if (homepageOrder !== undefined) { sets.push('homepage_order = ?'); params.push(homepageOrder); }
      if (gridSpan !== undefined) { sets.push('grid_span = ?'); params.push(gridSpan); }
      if (sets.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      sets.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      await db.run(`UPDATE pages SET ${sets.join(', ')} WHERE id = ?`, params);
      const page = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
      return res.status(200).json(toCamel(page));
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' });
      }
      await db.run('DELETE FROM pages WHERE id = ?', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
