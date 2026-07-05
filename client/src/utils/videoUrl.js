/**
 * Converts various video share URLs into direct-playable URLs.
 *
 * Supported:
 *  - Google Drive share links  → direct download stream
 *  - Google Drive open links   → direct download stream
 *  - Everything else           → returned as-is
 */

// Google Drive patterns:
//   https://drive.google.com/file/d/<ID>/view?...
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>
const GDRIVE_VIEW_RE = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
const GDRIVE_OPEN_RE = /drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/;

export const extractGDriveId = (url) => {
  const m1 = url.match(GDRIVE_VIEW_RE);
  if (m1) return m1[1];
  const m2 = url.match(GDRIVE_OPEN_RE);
  if (m2) return m2[1];
  return null;
};

export const isGoogleDriveUrl = (url) => !!extractGDriveId(url);

/**
 * Returns a direct-playable URL.
 * For Google Drive, returns the direct download endpoint which
 * browsers can stream via <video> / ReactPlayer's file player.
 */
export const resolveVideoUrl = (url) => {
  if (!url) return url;

  const driveId = extractGDriveId(url);
  if (driveId) {
    // Google Drive direct download — works for files shared as "Anyone with link"
    return `https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`;
  }

  // Local uploaded file
  if (url.startsWith('/uploads')) {
    return `http://localhost:5000${url}`;
  }

  return url;
};

/**
 * Quick check: is this a URL we can attempt to play?
 */
export const isValidVideoUrl = (url) => {
  if (!url) return false;
  if (isGoogleDriveUrl(url)) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};
