import { clearSessionCookie, deleteSession } from '../../lib/auth';
import { getDb } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    await deleteSession(req, db);
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  } catch (err) {
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  }
}