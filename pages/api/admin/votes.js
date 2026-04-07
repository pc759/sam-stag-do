import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser || !sessionUser.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const votes = await db.all(
      `SELECT id, title, status, created_at as createdAt, closed_at as closedAt, deleted_at as deletedAt
       FROM votes
       WHERE deleted_at IS NULL
       ORDER BY id DESC`
    );
    const out = [];
    for (const v of votes) {
      const participants = await db.all(
        'SELECT user_id as userId FROM vote_participants WHERE vote_id = ?',
        [v.id]
      );
      const candidates = await db.all(
        'SELECT user_id as userId FROM vote_candidates WHERE vote_id = ?',
        [v.id]
      );
      out.push({
        ...v,
        participantIds: participants.map((p) => p.userId),
        candidateIds: candidates.map((c) => c.userId)
      });
    }
    return res.status(200).json(out);
  }

  if (req.method === 'POST') {
    const { title, participantIds, candidateIds } = req.body || {};
    const pIds = Array.isArray(participantIds)
      ? [...new Set(participantIds.map(Number).filter(Boolean))]
      : [];
    const cIds = Array.isArray(candidateIds)
      ? [...new Set(candidateIds.map(Number).filter(Boolean))]
      : [];
    if (!pIds.length || !cIds.length) {
      return res.status(400).json({ error: 'participantIds and candidateIds required' });
    }
    const pSet = new Set(pIds);
    if (!cIds.every((id) => pSet.has(id))) {
      return res.status(400).json({ error: 'All candidates must be participants' });
    }

    const r = await db.run(
      `INSERT INTO votes (title, status) VALUES (?, 'draft')`,
      [(title || '').trim() || 'Vote']
    );
    const voteId = r.lastID;
    for (const uid of pIds) {
      await db.run('INSERT INTO vote_participants (vote_id, user_id) VALUES (?, ?)', [voteId, uid]);
    }
    for (const uid of cIds) {
      await db.run('INSERT INTO vote_candidates (vote_id, user_id) VALUES (?, ?)', [voteId, uid]);
    }
    return res.status(201).json({ id: voteId });
  }

  if (req.method === 'PATCH') {
    const { id, action } = req.body || {};
    const voteId = Number(id);
    if (!voteId || !action) {
      return res.status(400).json({ error: 'id and action required' });
    }
    const vote = await db.get('SELECT id, status FROM votes WHERE id = ? AND deleted_at IS NULL', [
      voteId
    ]);
    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    if (action === 'open') {
      if (vote.status !== 'draft') {
        return res.status(400).json({ error: 'Vote is not draft' });
      }
      await db.run(`UPDATE votes SET status = 'open' WHERE id = ?`, [voteId]);
      return res.status(200).json({ success: true });
    }

    if (action === 'close') {
      if (vote.status !== 'open') {
        return res.status(400).json({ error: 'Vote is not open' });
      }
      await db.run(
        `UPDATE votes SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [voteId]
      );
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      await db.run(`UPDATE votes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [voteId]);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
