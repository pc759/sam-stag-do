import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: 'stories.db', driver: sqlite3.Database });

await db.run("UPDATE pages SET grid_span='4', homepage_order=1 WHERE id=9");
await db.run("UPDATE pages SET grid_span='4', homepage_order=2 WHERE id=13");
await db.run("UPDATE pages SET grid_span='4', homepage_order=3 WHERE id=2");
await db.run("UPDATE pages SET grid_span='6', homepage_order=4 WHERE id=3");
await db.run("UPDATE pages SET grid_span='6', homepage_order=5 WHERE id=4");
await db.run("UPDATE pages SET grid_span='6', homepage_order=6 WHERE id=5");
await db.run("UPDATE pages SET grid_span='6', homepage_order=7 WHERE id=6");

const rows = await db.all('SELECT id,title,grid_span,homepage_order FROM pages WHERE show_on_homepage=1 ORDER BY homepage_order');
console.log(JSON.stringify(rows, null, 2));
await db.close();
