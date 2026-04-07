import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: './stories.db', driver: sqlite3.Database });

const cols = await db.all('PRAGMA table_info(pages)');
const colNames = cols.map(c => c.name);
console.log('Current columns:', colNames.join(', '));

if (!colNames.includes('show_on_homepage')) {
  await db.exec('ALTER TABLE pages ADD COLUMN show_on_homepage INTEGER DEFAULT 0');
  console.log('Added show_on_homepage');
}
if (!colNames.includes('homepage_order')) {
  await db.exec('ALTER TABLE pages ADD COLUMN homepage_order INTEGER DEFAULT 0');
  console.log('Added homepage_order');
}
if (!colNames.includes('grid_span')) {
  await db.exec(`ALTER TABLE pages ADD COLUMN grid_span TEXT DEFAULT '4'`);
  console.log('Added grid_span');
}

const updatedCols = await db.all('PRAGMA table_info(pages)');
console.log('Updated columns:', updatedCols.map(c => c.name).join(', '));
await db.close();
