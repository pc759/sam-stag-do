import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: './stories.db', driver: sqlite3.Database });

const pages = [
  { title: 'When', slug: 'when', icon: '📅', subtitle: 'June/July 2025', body: '<p>Specific dates to be confirmed. Check back soon for exact dates and times.</p>', show_in_nav: 0, sort_order: 1, is_published: 1, show_on_homepage: 1, homepage_order: 1, grid_span: '4' },
  { title: 'Where', slug: 'where', icon: '📍', subtitle: 'Location TBD', body: '<p>We are still finalizing the location. It is going to be epic, that is all we can say for now.</p>', show_in_nav: 0, sort_order: 2, is_published: 1, show_on_homepage: 1, homepage_order: 2, grid_span: '4' },
  { title: 'Cost', slug: 'cost', icon: '💰', subtitle: 'TBD', body: '<p>Budget breakdown and payment details coming soon. We will keep it reasonable (probably).</p>', show_in_nav: 0, sort_order: 3, is_published: 1, show_on_homepage: 1, homepage_order: 3, grid_span: '4' },
  { title: 'What to Bring', slug: 'what-to-bring', icon: '🎒', subtitle: 'Essential kit list', body: '<ul><li>Valid ID / Passport</li><li>Comfortable shoes</li><li>Smart casual outfit for dinner</li><li>Sense of humor</li><li>Willingness to embarrass Sam</li><li>Phone charger</li></ul>', show_in_nav: 1, sort_order: 4, is_published: 1, show_on_homepage: 1, homepage_order: 4, grid_span: '6' },
  { title: 'Itinerary', slug: 'itinerary', icon: '📋', subtitle: 'The plan for the weekend', body: '<p>The full itinerary will be posted here as we get closer to the date. For now, just know it is going to involve good food, good drinks, and plenty of opportunities to remind Sam of his questionable life choices.</p>', show_in_nav: 1, sort_order: 5, is_published: 1, show_on_homepage: 1, homepage_order: 5, grid_span: '6' },
  { title: 'Questions', slug: 'questions', icon: '❓', subtitle: 'Got questions?', body: '<p>If you have any questions about the weekend, drop them in the chat or reach out directly.</p>', show_in_nav: 1, sort_order: 6, is_published: 1, show_on_homepage: 1, homepage_order: 6, grid_span: '4' }
];

for (const p of pages) {
  const existing = await db.get('SELECT id FROM pages WHERE slug = ?', p.slug);
  if (existing) {
    console.log(`${p.title}: already exists (id ${existing.id})`);
  } else {
    const r = await db.run(
      'INSERT INTO pages (title, slug, icon, subtitle, body, show_in_nav, sort_order, is_published, show_on_homepage, homepage_order, grid_span) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p.title, p.slug, p.icon, p.subtitle, p.body, p.show_in_nav, p.sort_order, p.is_published, p.show_on_homepage, p.homepage_order, p.grid_span]
    );
    console.log(`${p.title}: inserted (id ${r.lastID})`);
  }
}

const count = await db.get('SELECT COUNT(*) as c FROM pages');
console.log(`\nDone. Total pages: ${count.c}`);
await db.close();
