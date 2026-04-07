import { getDb } from '../../lib/db';
import { getSessionUser } from '../../lib/auth';
import { RAW_TAG_SELECT, userIsMurdered } from '../../lib/userTags';
import { computeViewerVoteState } from '../../lib/voteViewer';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawTags = await loadRawTags(db, sessionUser.id);

  const votes = await db.all(
    `SELECT id, title, status, created_at as createdAt, closed_at as closedAt
     FROM votes
     WHERE deleted_at IS NULL AND status IN ('open', 'closed')
     ORDER BY id DESC`
  );

  const out = [];
  for (const v of votes) {
    const participants = await db.all(
      'SELECT user_id as userId FROM vote_participants WHERE vote_id = ?',
      [v.id]
    );
    const participantIds = participants.map((p) => p.userId);
    const state = computeViewerVoteState({
      status: v.status,
      participantIds,
      userId: sessionUser.id,
      rawTags
    });

    let results = null;
    if (v.status === 'closed') {
      const tallies = await db.all(
        `SELECT chosen_user_id as userId, COUNT(*) as count
         FROM vote_ballots
         WHERE vote_id = ?
         GROUP BY chosen_user_id`,
        [v.id]
      );
      const names = await db.all(
        `SELECT u.id, u.name FROM users u
         INNER JOIN vote_candidates vc ON vc.user_id = u.id AND vc.vote_id = ?`,
        [v.id]
      );
      const nameById = Object.fromEntries(names.map((n) => [n.id, n.name]));
      results = tallies.map((t) => ({
        userId: t.userId,
        name: nameById[t.userId] || 'Unknown',
        count: t.count
      }));
    }

    const ballot = await db.get(
      'SELECT chosen_user_id as chosenUserId FROM vote_ballots WHERE vote_id = ? AND voter_id = ?',
      [v.id, sessionUser.id]
    );
    const myChoice = ballot?.chosenUserId ?? null;

    out.push({
      id: v.id,
      title: v.title,
      status: v.status,
      createdAt: v.createdAt,
      closedAt: v.closedAt,
      viewerCanVote: state.viewerCanVote,
      viewerVoteUiState: state.viewerVoteUiState,
      viewerPendingReason: state.viewerPendingReason,
      results,
      myChoice
    });
  }

  return res.status(200).json({ votes: out, isMurdered: userIsMurdered(rawTags) });
}
