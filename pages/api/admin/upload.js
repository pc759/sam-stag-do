import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export const config = {
  api: {
    bodyParser: false
  }
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = await getDb();
  const user = await getSessionUser(req, db);
  if (!user?.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  } catch (e) {
    return res.status(500).json({ error: 'Could not create upload directory' });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: MAX_BYTES,
    filename: (_name, ext) => `${randomUUID()}${ext || ''}`,
    filter: ({ mimetype }) => Boolean(mimetype && ALLOWED.has(mimetype))
  });

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    const code = err?.httpCode || err?.statusCode;
    const status = code && code >= 400 && code < 600 ? code : 400;
    return res.status(status).json({ error: err.message || 'Upload failed' });
  }

  const list = files.file;
  const file = Array.isArray(list) ? list[0] : list;
  if (!file || !file.filepath) {
    return res.status(400).json({ error: 'No image file provided (field name: file)' });
  }

  const basename = path.basename(file.filepath);
  const url = `/uploads/${basename}`;
  return res.status(200).json({ url });
}
