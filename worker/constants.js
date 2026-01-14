// Backend constants for the Cloudflare Worker

// Rate limiting
export const RATE_LIMIT = 10; // max requests per window
export const RATE_WINDOW_SECONDS = 3600; // 1 hour

// Countdown storage
export const COUNTDOWN_TTL_DAYS = 90;
export const COUNTDOWN_TTL_SECONDS = COUNTDOWN_TTL_DAYS * 24 * 60 * 60;

// Random ID length for share links
export const ID_LENGTH = 8;
export const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Chrome Web Store URL
export const CHROME_STORE_URL = "https://chromewebstore.google.com/detail/every-second-counts/dbpmgoghpheaeldmfgifedhjbdookjbo";
