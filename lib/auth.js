import crypto from 'crypto';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  const pairs = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => cookie.split('='));
  return Object.fromEntries(pairs);
}

export async function getSessionUser(req, db) {
  const cookies = parseCookies(req);
  const token = cookies.session_token;

  if (!token) {
    return null;
  }

  const row = await db.get(
    `SELECT u.id, u.username, u.name, u.mobile, u.is_admin as isAdmin, u.photo_url as photoUrl,
            u.connection, u.memories
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP`,
    [token]
  );

  return row || null;
}

export async function isAuthenticated(req, db) {
  const user = await getSessionUser(req, db);
  return Boolean(user);
}

export function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `session_token=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}

export async function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.run(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES (?, ?, datetime('now', '+7 days'))`,
    [token, userId]
  );
  return token;
}

export async function deleteSession(req, db) {
  const cookies = parseCookies(req);
  if (!cookies.session_token) {
    return;
  }
  await db.run('DELETE FROM sessions WHERE token = ?', [cookies.session_token]);
}