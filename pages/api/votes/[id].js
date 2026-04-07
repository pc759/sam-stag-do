import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';
import { RAW_TAG_SELECT, userIsMurdered } from '../../../lib/userTags';
import { computeViewerVoteState } from '../../../lib/voteViewer';

async function loadRawTags(db, userId) {
  return db.all(
    `SELECT ${RAW_TAG_SELECT}
     FROM user_tags ut
     JOIN tags t ON t.id = ut.tag_id
     WHERE ut.user_id = ?`,
    [userId]
  );
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const voteId = Number(req.query.id);
  if (!voteId) {
    return res.status(400).json({ error: 'Invalid vote id' });
  }

  const vote = await db.get(
    `SELECT id, title, status, created_at as createdAt, closed_at as closedAt
     FROM votes
     WHERE id = ? AND deleted_at IS NULL`,
    [voteId]
  );

  if (!vote) {
    return res.status(404).json({ error: 'Vote not found' });
  }

  if (vote.status === 'draft' && !sessionUser.isAdmin) {
    return res.status(404).json({ error: 'Vote not found' });
  }

  const rawTags = await loadRawTags(db, sessionUser.id);
  const murdered = userIsMurdered(rawTags);

  const participants = await db.all(
    'SELECT user_id as userId FROM vote_participants WHERE vote_id = ?',
    [voteId]
  );
  const participantIds = participants.map((p) => p.userId);

  const candidates = await db.all(
    `SELECT u.id, u.name, u.photo_url as photoUrl
     FROM users u
     INNER JOIN vote_candidates vc ON vc.user_id = u.id AND vc.vote_id = ?
     ORDER BY u.name ASC`,
    [voteId]
  );

  const state = computeViewerVoteState({
    status: vote.status,
    participantIds,
    userId: sessionUser.id,
    rawTags
  });

  const ballot = await db.get(
    'SELECT chosen_user_id as chosenUserId FROM vote_ballots WHERE vote_id = ? AND voter_id = ?',
    [voteId, sessionUser.id]
  );
  const myChoice = ballot?.chosenUserId ?? null;

  let results = null;
  if (vote.status === 'closed') {
    const tallies = await db.all(
      `SELECT chosen_user_id as userId, COUNT(*) as count
       FROM vote_ballots
       WHERE vote_id = ?
       GROUP BY chosen_user_id`,
      [voteId]
    );
    const nameById = Object.fromEntries(candidates.map((c) => [c.id, c.name]));
    results = tallies.map((t) => ({
      userId: t.userId,
      name: nameById[t.userId] || 'Unknown',
      count: t.count
    }));
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ...vote,
      candidates,
      viewerCanVote: state.viewerCanVote,
      viewerVoteUiState: state.viewerVoteUiState,
      viewerPendingReason: state.viewerPendingReason,
      results,
      myChoice,
      isMurdered: murdered
    });
  }

  if (req.method === 'POST') {
    if (vote.status !== 'open') {
      return res.status(400).json({ error: 'Voting is not open' });
    }
    if (!participantIds.includes(Number(sessionUser.id))) {
      return res.status(403).json({ error: 'You are not in this vote' });
    }
    if (murdered) {
      return res.status(403).json({ error: 'cannot_vote_murdered', code: 'cannot_vote_murdered' });
    }

    const { chosenUserId } = req.body || {};
    const choice = Number(chosenUserId);
    if (!choice) {
      return res.status(400).json({ error: 'chosenUserId required' });
    }

    const cand = await db.get(
      'SELECT 1 FROM vote_candidates WHERE vote_id = ? AND user_id = ?',
      [voteId, choice]
    );
    if (!cand) {
      return res.status(400).json({ error: 'Invalid choice' });
    }

    await db.run(
      `INSERT INTO vote_ballots (vote_id, voter_id, chosen_user_id, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(vote_id, voter_id) DO UPDATE SET
         chosen_user_id = excluded.chosen_user_id,
         updated_at = CURRENT_TIMESTAMP`,
      [voteId, sessionUser.id, choice]
    );

    return res.status(200).json({ success: true, chosenUserId: choice });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
