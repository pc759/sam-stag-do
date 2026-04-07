import { userIsMurdered } from './userTags';

/**
 * @param {object} opts
 * @param {string} opts.status
 * @param {number[]} opts.participantIds
 * @param {number} opts.userId
 * @param {import('./userTags').RawUserTag[]} opts.rawTags
 */
export function computeViewerVoteState({ status, participantIds, userId, rawTags }) {
  const murdered = userIsMurdered(rawTags);
  const isParticipant = participantIds.includes(Number(userId));
  const isOpen = status === 'open';
  const isClosed = status === 'closed';

  if (isClosed) {
    return {
      viewerCanVote: false,
      viewerVoteUiState: 'show_results',
      viewerPendingReason: null
    };
  }

  if (isOpen && isParticipant && !murdered) {
    return {
      viewerCanVote: true,
      viewerVoteUiState: 'can_vote',
      viewerPendingReason: null
    };
  }

  if (isOpen) {
    let viewerPendingReason = 'not_participant';
    if (murdered && isParticipant) {
      viewerPendingReason = 'murdered';
    } else if (!isParticipant) {
      viewerPendingReason = 'not_participant';
    }
    return {
      viewerCanVote: false,
      viewerVoteUiState: 'pending_results',
      viewerPendingReason
    };
  }

  return {
    viewerCanVote: false,
    viewerVoteUiState: 'pending_results',
    viewerPendingReason: 'draft'
  };
}
