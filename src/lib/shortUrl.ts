/**
 * Utilities for generating and parsing compact, stateless short URLs for rewards.
 * Converts 36-character hexadecimal UUIDs into 22-character Base64URL strings and back.
 */

/**
 * Converts a standard 36-char UUID (or 32-char hex string) to a 22-char base64url string.
 * Example: '7fd7c72f-0b2d-4d12-a2bb-58aabfe07a1e' -> 'f9fHLwstTRKiu1iqv-B6Hg'
 */
export function uuidToBase64Url(uuid: string): string {
  if (!uuid) return "";
  const cleanHex = uuid.replace(/-/g, "").toLowerCase();
  if (cleanHex.length !== 32 || !/^[0-9a-f]{32}$/.test(cleanHex)) {
    return uuid;
  }

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }

  let binStr = "";
  for (let i = 0; i < 16; i++) {
    binStr += String.fromCharCode(bytes[i]);
  }

  return btoa(binStr)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Converts a 22-char base64url string back to a standard 36-char UUID (with hyphens).
 * If the input is already a UUID or invalid, it gracefully returns it.
 */
export function base64UrlToUuid(shortId: string): string {
  if (!shortId) return "";

  // Already standard UUID format
  if (shortId.length === 36 && shortId.includes("-")) {
    return shortId.toLowerCase();
  }

  // 32-hex characters without dashes
  if (shortId.length === 32 && /^[0-9a-fA-F]{32}$/.test(shortId)) {
    return formatUuidWithHyphens(shortId.toLowerCase());
  }

  try {
    let base64 = shortId.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    const binStr = atob(base64);
    if (binStr.length !== 16) {
      return shortId;
    }

    let hex = "";
    for (let i = 0; i < 16; i++) {
      hex += binStr.charCodeAt(i).toString(16).padStart(2, "0");
    }

    return formatUuidWithHyphens(hex);
  } catch {
    return shortId;
  }
}

function formatUuidWithHyphens(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`.toLowerCase();
}

/**
 * Builds a compact short URL for a channel reward.
 * E.g. https://xyan.necko.moe/r/garbazan/f9fHLwstTRKiu1iqv-B6Hg
 */
export function getShortRewardUrl(
  identifier: string,
  rewardTwitchId: string,
  origin?: string
): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const shortId = uuidToBase64Url(rewardTwitchId);
  return `${base}/r/${encodeURIComponent(identifier)}/${shortId}`;
}

/**
 * Builds the canonical full URL for a channel reward.
 * E.g. https://xyan.necko.moe/c/garbazan/rewards/7fd7c72f-0b2d-4d12-a2bb-58aabfe07a1e
 */
export function getFullRewardUrl(
  identifier: string,
  rewardTwitchId: string,
  origin?: string
): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/c/${encodeURIComponent(identifier)}/rewards/${rewardTwitchId}`;
}
