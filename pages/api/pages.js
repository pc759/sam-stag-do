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
    if (req.query.slug) {
      const page = await db.get(
        'SELECT * FROM pages WHERE slug = ? AND is_published = 1',
        [req.query.slug]
      );
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      return res.status(200).json({
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
        gridSpan: page.grid_span
      });
    }

    const pages = await db.all(
      'SELECT id, title, slug, icon, subtitle, show_in_nav, sort_order, show_on_homepage, homepage_order, grid_span FROM pages WHERE is_published = 1 ORDER BY sort_order ASC'
    );
    return res.status(200).json(
      pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        icon: p.icon,
        subtitle: p.subtitle,
        showInNav: !!p.show_in_nav,
        sortOrder: p.sort_order,
        showOnHomepage: !!p.show_on_homepage,
        homepageOrder: p.homepage_order,
        gridSpan: p.grid_span
      }))
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
