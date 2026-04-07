import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { hashPassword } from './password';

const dbPath = path.join(process.cwd(), 'stories.db');
let dbPromise;

async function columnExists(db, table, column) {
  const rows = await db.all(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === column);
}

async function ensureColumn(db, table, column, sql) {
  if (!(await columnExists(db, table, column))) {
    await db.exec(sql);
  }
}

async function initialize(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      story TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      photo_url TEXT,
      connection TEXT,
      memories TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      badge_color TEXT DEFAULT '#374151',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_tags (
      user_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, tag_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      deleted_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS vote_participants (
      vote_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (vote_id, user_id),
      FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS vote_candidates (
      vote_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (vote_id, user_id),
      FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS vote_ballots (
      vote_id INTEGER NOT NULL,
      voter_id INTEGER NOT NULL,
      chosen_user_id INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (vote_id, voter_id),
      FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE,
      FOREIGN KEY (voter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chosen_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS traitor_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_traitor_posts_created_at ON traitor_posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_votes_deleted ON votes(deleted_at);

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT,
      expense_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_pence INTEGER NOT NULL CHECK (amount_pence >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      expense_id INTEGER,
      amount_pence INTEGER NOT NULL CHECK (amount_pence >= 0),
      notes TEXT,
      payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(expense_id) REFERENCES expenses(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
    CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
    CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_expense_id ON payments(expense_id);
    CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      body TEXT DEFAULT '',
      show_in_nav INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      show_on_homepage INTEGER NOT NULL DEFAULT 0,
      homepage_order INTEGER NOT NULL DEFAULT 0,
      grid_span INTEGER NOT NULL DEFAULT 4,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_sort_order ON pages(sort_order);

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

  await ensureColumn(
    db,
    'tags',
    'hidden_from_attendees',
    'ALTER TABLE tags ADD COLUMN hidden_from_attendees INTEGER NOT NULL DEFAULT 0'
  );
  await ensureColumn(db, 'tags', 'photo_overlay', 'ALTER TABLE tags ADD COLUMN photo_overlay TEXT');
  await ensureColumn(
    db,
    'tags',
    'traitor_channel',
    'ALTER TABLE tags ADD COLUMN traitor_channel INTEGER NOT NULL DEFAULT 0'
  );

  const adminUsername = 'pete';
  const existingAdmin = await db.get('SELECT id FROM users WHERE username = ? AND is_admin = 1', [
    adminUsername
  ]);

  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'stagadmin2025';
    await db.run(
      `INSERT INTO users (username, name, mobile, password_hash, is_admin)
       VALUES (?, ?, ?, ?, 1)`,
      [adminUsername, 'Pete', null, hashPassword(adminPassword)]
    );
  }
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    }).then(async (db) => {
      await initialize(db);
      return db;
    });
  }

  return dbPromise;
}
