/**
 * @typedef {object} RawUserTag
 * @property {number} id
 * @property {string} name
 * @property {string} icon
 * @property {string} badgeColor
 * @property {number} hiddenFromAttendees
 * @property {string|null} [photoOverlay]
 * @property {number} traitorChannel
 */

/**
 * @param {RawUserTag[]} rawRows
 * @param {boolean} isAdmin
 */
export function getVisibleTagsForViewer(rawRows, isAdmin) {
  return rawRows
    .filter((t) => isAdmin || !Number(t.hiddenFromAttendees))
    .map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      badgeColor: t.badgeColor
    }));
}

/** @param {RawUserTag[]} rawRows */
export function computePhotoOverlay(rawRows) {
  if (rawRows.some((t) => t.photoOverlay === 'murdered')) {
    return 'murdered';
  }
  return null;
}

/** @param {RawUserTag[]} rawRows */
export function userIsMurdered(rawRows) {
  return rawRows.some((t) => t.photoOverlay === 'murdered');
}

/** @param {RawUserTag[]} rawRows */
export function userHasTraitorChannel(rawRows) {
  return rawRows.some((t) => Number(t.traitorChannel) === 1);
}

export const RAW_TAG_SELECT = `t.id, t.name, t.icon, t.badge_color as badgeColor,
  COALESCE(t.hidden_from_attendees, 0) as hiddenFromAttendees,
  t.photo_overlay as photoOverlay,
  COALESCE(t.traitor_channel, 0) as traitorChannel`;
