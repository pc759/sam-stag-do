import Database from 'better-sqlite3';
import path from 'path';

// Initialize database
const dbPath = path.join(process.cwd(), 'db.sqlite');
const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    story TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Fetch all stories
    try {
      const stories = db.prepare('SELECT * FROM stories ORDER BY created_at DESC').all();
      res.status(200).json(stories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stories' });
    }
  } else if (req.method === 'POST') {
    // Add new story
    const { author, story } = req.body;

    if (!author || !story) {
      return res.status(400).json({ error: 'Author and story are required' });
    }

    try {
      const stmt = db.prepare('INSERT INTO stories (author, story) VALUES (?, ?)');
      stmt.run(author, story);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save story' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
