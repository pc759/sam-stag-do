import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'stories.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        story TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getDb();
      const stories = db.prepare('SELECT * FROM stories ORDER BY created_at DESC').all();
      res.status(200).json(stories);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to fetch stories' });
    }
  } else if (req.method === 'POST') {
    try {
      const { author, story } = req.body;
      
      if (!author || !story) {
        return res.status(400).json({ error: 'Author and story are required' });
      }

      const db = getDb();
      const stmt = db.prepare('INSERT INTO stories (author, story) VALUES (?, ?)');
      const result = stmt.run(author, story);
      
      res.status(201).json({ 
        id: result.lastInsertRowid,
        author,
        story,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to save story' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}