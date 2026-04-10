import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: 'stories.db', driver: sqlite3.Database });

const pages = [
  { slug: 'stories', title: "Sam's Questionable Choices", subtitle: "A repository of embarrassing stories and moments we'll never let him forget" },
  { slug: 'votes', title: 'Votes', subtitle: "Cast your vote while a round is open. You won't see who anyone else voted for. After a vote closes, everyone sees totals only." },
  { slug: 'traitor-board', title: "Traitors' Channel", subtitle: "Private to players with the traitor tag. Don't share your screen with faithfuls." },
  { slug: 'chat', title: 'Dear Stagony Aunt', subtitle: '' }
];

for (const p of pages) {
  const existing = await db.get('SELECT id FROM pages WHERE slug = ?', [p.slug]);
  if (existing) {
    console.log(`  skip: "${p.slug}" already exists (id ${existing.id})`);
    continue;
  }
  const result = await db.run(
    `INSERT INTO pages (title, slug, icon, subtitle, body, show_in_nav, sort_order, is_published, show_on_homepage, homepage_order, grid_span)
     VALUES (?, ?, '', ?, '', 0, 0, 1, 0, 0, 'span 1')`,
    [p.title, p.slug, p.subtitle]
  );
  console.log(`  added: "${p.slug}" (id ${result.lastID})`);
}

const count = await db.get('SELECT COUNT(*) as n FROM pages');
console.log(`Total pages: ${count.n}`);
await db.close();
