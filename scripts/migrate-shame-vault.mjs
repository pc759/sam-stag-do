import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: 'stories.db', driver: sqlite3.Database });

// 1. Create a CMS page for "Sam's Questionable Choices"
await db.run(`INSERT INTO pages (title, slug, icon, subtitle, body, show_in_nav, is_published, sort_order, show_on_homepage, homepage_order, grid_span)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
  "Sam's Questionable Choices",
  'questionable-choices',
  '😂',
  'Embarrassing stories and moments we will never let him forget.',
  '<p>A lovingly curated collection of Sam\'s finest moments. The ones he wishes we\'d forget, but we never will.</p><p><a href="/stories">Read the stories →</a></p>',
  0, // show_in_nav = false (accessed via Shame Vault dropdown)
  1, // is_published
  20,
  0, // show_on_homepage = false
  0,
  'span 1'
]);

const page = await db.get('SELECT id FROM pages WHERE slug = ?', ['questionable-choices']);
console.log('Created page id:', page.id);

// 2. Add two nav_items as children of Shame Vault (id=6)
await db.run(`INSERT INTO nav_items (label, page_id, url, parent_id, sort_order, is_visible)
  VALUES (?, ?, ?, ?, ?, ?)`, [
  'Questionable Choices', page.id, '', 6, 1, 1
]);

await db.run(`INSERT INTO nav_items (label, page_id, url, parent_id, sort_order, is_visible)
  VALUES (?, ?, ?, ?, ?, ?)`, [
  'Dear Stagony Aunt', null, '/chat', 6, 2, 1
]);

console.log('Seeded 2 nav items under Shame Vault dropdown.');

// Verify
const children = await db.all('SELECT id, label, url, parent_id FROM nav_items WHERE parent_id = 6');
console.log('Shame Vault children:', JSON.stringify(children, null, 2));

await db.close();
console.log('Done.');
