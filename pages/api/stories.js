import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'stories.db');
const db = new sqlite3.Database(dbPath);

// Initialize table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      story TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

export default function handler(req, res) {
  if (req.method === 'GET') {
    db.all('SELECT * FROM stories ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('GET Error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json(rows || []);
    });
  } 
  else if (req.method === 'POST') {
    const { author, story } = req.body;
    
    if (!author || !story) {
      return res.status(400).json({ error: 'Missing author or story' });
    }

    db.run(
      'INSERT INTO stories (author, story) VALUES (?, ?)',
      [author, story],
      function(err) {
        if (err) {
          console.error('POST Error:', err);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ success: true, id: this.lastID });
      }
    );
  } 
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}