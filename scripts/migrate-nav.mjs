import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPath = path.join(process.cwd(), 'stories.db');

async function main() {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });

  // Create nav_items table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS nav_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      page_id INTEGER,
      label TEXT NOT NULL,
      url TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      open_in_new_tab INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(parent_id) REFERENCES nav_items(id) ON DELETE CASCADE,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_nav_items_parent_id ON nav_items(parent_id);
    CREATE INDEX IF NOT EXISTS idx_nav_items_sort_order ON nav_items(sort_order);
  `);

  console.log('nav_items table created (or already exists).');

  // Check if any nav items already exist
  const count = await db.get('SELECT COUNT(*) AS cnt FROM nav_items');
  if (count.cnt > 0) {
    console.log(`nav_items already has ${count.cnt} rows — skipping seed.`);
    await db.close();
    return;
  }

  // Seed default menu items
  let sortOrder = 0;

  // Home
  await db.run(
    'INSERT INTO nav_items (label, url, sort_order) VALUES (?, ?, ?)',
    ['Home', '/', sortOrder++]
  );

  // CMS pages with show_in_nav = 1
  const navPages = await db.all(
    'SELECT id, title FROM pages WHERE show_in_nav = 1 AND is_published = 1 ORDER BY sort_order ASC'
  );
  for (const page of navPages) {
    await db.run(
      'INSERT INTO nav_items (label, page_id, sort_order) VALUES (?, ?, ?)',
      [page.title, page.id, sortOrder++]
    );
  }

  // Shame Vault
  await db.run(
    'INSERT INTO nav_items (label, url, sort_order) VALUES (?, ?, ?)',
    ['Shame Vault', '/shame-vault', sortOrder++]
  );

  // Votes
  await db.run(
    'INSERT INTO nav_items (label, url, sort_order) VALUES (?, ?, ?)',
    ['Votes', '/votes', sortOrder++]
  );

  const finalCount = await db.get('SELECT COUNT(*) AS cnt FROM nav_items');
  console.log(`Seeded ${finalCount.cnt} nav items.`);

  await db.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
