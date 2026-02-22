/**
 * Every Second Counts - New Tab Countdown Extension
 *
 * This extension replaces the new tab page with a countdown timer.
 * Features:
 * - Set target date/time for countdown
 * - Sound alert when countdown ends
 * - Shareable countdown links via Cloudflare Worker
 * - Pomodoro timer with focus/break auto-cycling
 */

const $ = (id) => document.getElementById(id);

// =============================================================================
// DOM Elements
// =============================================================================

const hh = $("hh");
const mm = $("mm");
const ss = $("ss");
const targetText = $("targetText");
const statusText = $("statusText");
const pomoMm = $("pomoMm");
const pomoSs = $("pomoSs");
const pomoPhase = $("pomoPhase");
const pomoStatus = $("pomoStatus");
const pomoSessions = $("pomoSessions");
const pomoStartPauseBtn = $("pomoStartPauseBtn");
const pomoSkipBtn = $("pomoSkipBtn");
const pomoResetBtn = $("pomoResetBtn");
const pomoStopBtn = $("pomoStopBtn");
const pomoToggleBtn = $("pomoToggleBtn");
const pomoSetupBtn = $("pomoSetupBtn");
const pomoDrawer = $("pomoDrawer");
const pomoToast = $("pomoToast");
const pomoMainView = $("pomoMainView");
const pomoSetupView = $("pomoSetupView");
const pomoSetupCancelBtn = $("pomoSetupCancelBtn");
const pomoSetupError = $("pomoSetupError");
const pomoFocusInput = $("pomoFocusInput");
const pomoShortBreakInput = $("pomoShortBreakInput");
const pomoLongBreakInput = $("pomoLongBreakInput");
const pomoLongEveryInput = $("pomoLongEveryInput");
const pomoRunIntervalsInput = $("pomoRunIntervalsInput");
const pomoSoundToggleInput = $("pomoSoundToggleInput");

// Date modal elements
const dateModal = $("dateModal");
const dtInput = $("dtInput");

// Settings modal elements
const settingsModal = $("settingsModal");
const settingsBtn = $("settingsBtn");
const soundToggle = $("soundToggle");
const fontSection = $("fontSection");
const fontLock = $("fontLock");
const clockFontSelect = $("clockFontSelect");
const textFontSelect = $("textFontSelect");
const shareBtn = $("shareBtn");
const shareStatus = $("shareStatus");
const licenseModal = $("licenseModal");
const licenseInput = $("licenseInput");
const activateBtn = $("activateBtn");
const licenseError = $("licenseError");

// Constants are loaded from constants.js

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Pads a number with leading zero if needed
 * @param {number} n - Number to pad
 * @returns {string} Two-digit string
 */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Formats a Date object to a readable local string
 * @param {Date} dt - Date to format
 * @returns {string} Formatted date string
 */
function formatLocal(dt) {
  return dt.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/**
 * Converts ISO local string to Date object
 * @param {string} isoLocal - ISO string like "2026-01-31T23:59"
 * @returns {Date} Date object
 */
function isoLocalToDate(isoLocal) {
  const [datePart, timePart] = isoLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

const POMODORO_PHASE_LABELS = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break"
};

const DEFAULT_POMODORO_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  runIntervals: 4,
  pomodoroSoundEnabled: true
};

function getPomodoroRemainingMs(pomodoroState) {
  if (!pomodoroState) return 0;
  if (pomodoroState.isRunning && pomodoroState.endTimeMs) {
    return Math.max(0, pomodoroState.endTimeMs - Date.now());
  }
  return Math.max(0, pomodoroState.remainingMs || 0);
}

function renderPomodoro(pomodoroState, pomodoroSettings = DEFAULT_POMODORO_SETTINGS) {
  if (!pomoMm || !pomoSs || !pomoPhase || !pomoStatus || !pomoSessions || !pomoStartPauseBtn) {
    return;
  }

  if (!pomodoroState) {
    pomoMm.textContent = "25";
    pomoSs.textContent = "00";
    pomoPhase.textContent = "Focus";
    pomoStatus.textContent = "Start now?";
    pomoSessions.textContent = `Focus sessions: 0/${pomodoroSettings.runIntervals}`;
    pomoStartPauseBtn.textContent = "Start";
    return;
  }

  const totalSeconds = Math.max(0, Math.ceil(getPomodoroRemainingMs(pomodoroState) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  pomoMm.textContent = pad2(minutes);
  pomoSs.textContent = pad2(seconds);
  pomoPhase.textContent = POMODORO_PHASE_LABELS[pomodoroState.phase] || "Focus";
  if (pomodoroState.isRunning) {
    pomoStatus.textContent = "Running";
  } else if (pomodoroState.status === "stopped") {
    pomoStatus.textContent = pomodoroState.stopReason === "manual" ? "Stopped" : "Start now?";
  } else {
    pomoStatus.textContent = "Paused";
  }
  pomoSessions.textContent = `Focus sessions: ${pomodoroState.completedFocusSessions || 0}/${pomodoroSettings.runIntervals}`;
  pomoStartPauseBtn.textContent = pomodoroState.isRunning ? "Pause" : "Start";
}

async function sendPomodoroMessage(type, payload = {}) {
  try {
    return await chrome.runtime.sendMessage({ type, ...payload });
  } catch (e) {
    return { ok: false, error: e?.message || "Unable to contact background worker" };
  }
}

// =============================================================================
// License Functions
// =============================================================================

/**
 * Gets the stored license from storage
 * @returns {Promise<{key: string, status: string, validatedAt: number, expiresAt: string|null}|null>}
 */
async function getLicense() {
  const { license = null } = await chrome.storage.sync.get({ license: null });
  return license;
}

/**
 * Saves license to storage
 * @param {object} license - License object
 */
async function setLicense(license) {
  await chrome.storage.sync.set({ license });
}

/**
 * Checks if user has active premium status
 * @returns {Promise<boolean>}
 */
async function isPremium() {
  const license = await getLicense();
  if (!license || license.status !== 'active') return false;

  // Check if revalidation is needed (7 days)
  const now = Date.now();
  if (now - license.validatedAt > LICENSE_REVALIDATION_MS) {
    // Revalidate in background
    revalidateLicense(license.key);
  }

  // Check expiration (for non-lifetime licenses)
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Revalidates license with server in background
 * @param {string} licenseKey
 */
async function revalidateLicense(licenseKey) {
  try {
    const response = await fetch(`${WORKER_URL}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });

    const data = await response.json();

    if (data.valid) {
      await setLicense({
        key: licenseKey,
        status: 'active',
        validatedAt: Date.now(),
        expiresAt: data.expiresAt || null
      });
    } else {
      await setLicense({
        key: licenseKey,
        status: 'expired',
        validatedAt: Date.now(),
        expiresAt: null
      });
    }
  } catch (e) {
    // Network error - keep existing status
    console.error('License revalidation failed:', e);
  }
}

/**
 * Activates a license key
 * @param {string} licenseKey
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function activateLicense(licenseKey) {
  try {
    const response = await fetch(`${WORKER_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });

    const data = await response.json();

    if (data.success) {
      await setLicense({
        key: licenseKey,
        status: 'active',
        validatedAt: Date.now(),
        expiresAt: data.expiresAt || null
      });
      return { success: true };
    }

    return { success: false, error: data.error || 'Activation failed' };
  } catch (e) {
    return { success: false, error: 'Network error' };
  }
}

// =============================================================================
// Chrome Storage Functions
// =============================================================================

/**
 * Gets today's end of day (11:59 PM) as ISO local string
 * @returns {string} ISO local string like "2026-02-05T23:59"
 */
function getTodayEOD() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59`;
}

/**
 * Gets the target date from storage
 * @returns {Promise<string>} ISO local string of target date
 */
async function getTargetIsoLocal() {
  const result = await chrome.storage.sync.get('targetIsoLocal');
  // If no target set, use today's end of day
  if (!result.targetIsoLocal) {
    return getTodayEOD();
  }
  return result.targetIsoLocal;
}

/**
 * Saves the target date to storage
 * @param {string} val - ISO local string to save
 */
async function setTargetIsoLocal(val) {
  await chrome.storage.sync.set({ targetIsoLocal: val });
}

/**
 * Gets sound enabled preference from storage
 * @returns {Promise<boolean>} Whether sound is enabled
 */
async function getSoundEnabled() {
  const { soundEnabled = true } = await chrome.storage.sync.get({ soundEnabled: true });
  return soundEnabled;
}

/**
 * Saves sound enabled preference to storage
 * @param {boolean} val - Sound enabled state
 */
async function setSoundEnabled(val) {
  await chrome.storage.sync.set({ soundEnabled: val });
}

function normalizeFontId(id) {
  return FONT_PRESETS[id] ? id : "default";
}

function resolveFontId(id, allowPremium) {
  const normalized = normalizeFontId(id);
  const preset = FONT_PRESETS[normalized];
  if (preset?.premium && !allowPremium) return "default";
  return normalized;
}

async function getClockFontId() {
  const { clockFontId = "default" } = await chrome.storage.sync.get({ clockFontId: "default" });
  return normalizeFontId(clockFontId);
}

async function getTextFontId() {
  const { textFontId = "default" } = await chrome.storage.sync.get({ textFontId: "default" });
  return normalizeFontId(textFontId);
}

async function setClockFontId(clockFontId) {
  await chrome.storage.sync.set({ clockFontId: normalizeFontId(clockFontId) });
}

async function setTextFontId(textFontId) {
  await chrome.storage.sync.set({ textFontId: normalizeFontId(textFontId) });
}

function applyFontPreferences(clockFontId, textFontId, allowPremium) {
  const appliedClockId = resolveFontId(clockFontId, allowPremium);
  const appliedTextId = resolveFontId(textFontId, allowPremium);
  const clockFont = FONT_PRESETS[appliedClockId] || FONT_PRESETS.default;
  const textFont = FONT_PRESETS[appliedTextId] || FONT_PRESETS.default;

  const root = document.documentElement;
  root.style.setProperty("--clock-font", clockFont.family);
  root.style.setProperty("--body-font", textFont.family);

  return { appliedClockId, appliedTextId };
}

/**
 * Gets which target the sound was played for (prevents repeat plays)
 * @returns {Promise<string|null>} ISO string of target that sound was played for
 */
async function getSoundPlayedFor() {
  const { soundPlayedFor = null } = await chrome.storage.sync.get({ soundPlayedFor: null });
  return soundPlayedFor;
}

/**
 * Records that sound was played for a specific target
 * @param {string} targetIso - ISO string of target
 */
async function setSoundPlayedFor(targetIso) {
  await chrome.storage.sync.set({ soundPlayedFor: targetIso });
}

/**
 * Gets current theme ID from storage
 * Falls back to system preference if not set
 * @returns {Promise<string>} Theme ID
 */
async function getThemeId() {
  const { themeId = null } = await chrome.storage.sync.get({ themeId: null });

  // Migration from old darkMode setting
  if (themeId === null) {
    const { darkMode = null } = await chrome.storage.sync.get({ darkMode: null });
    if (darkMode !== null) {
      const migratedTheme = darkMode ? 'dark' : 'light';
      await setThemeId(migratedTheme);
      return migratedTheme;
    }
    // Use system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return themeId;
}

/**
 * Saves theme ID to storage
 * @param {string} themeId - Theme ID
 */
async function setThemeId(themeId) {
  await chrome.storage.sync.set({ themeId });
}

/**
 * Gets custom theme colors from storage
 * @returns {Promise<object|null>} Custom theme colors or null
 */
async function getCustomTheme() {
  const { customTheme = null } = await chrome.storage.sync.get({ customTheme: null });
  return customTheme;
}

/**
 * Saves custom theme colors to storage
 * @param {object} colors - Custom theme colors
 */
async function setCustomTheme(colors) {
  await chrome.storage.sync.set({ customTheme: colors });
}

/**
 * Applies theme colors to the document
 * @param {string} themeId - Theme ID
 * @param {object} customColors - Optional custom colors for 'custom' theme
 */
function applyTheme(themeId, customColors = null) {
  const preset = THEME_PRESETS[themeId];
  const colors = themeId === 'custom' && customColors ? customColors : preset?.colors;

  if (!colors) return;

  const root = document.documentElement;
  root.style.setProperty('--bg', colors.bg);
  root.style.setProperty('--text', colors.text);
  root.style.setProperty('--muted', colors.muted);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--input-bg', colors.inputBg);
  root.style.setProperty('--card-bg', colors.bg);

  // body.has-bg-image overrides --text and related vars at the body level,
  // which takes precedence over root for all child elements. For custom theme,
  // set inline styles on body so the user's chosen colors always win.
  const bodyStyle = document.body.style;
  if (themeId === 'custom') {
    bodyStyle.setProperty('--text', colors.text);
    bodyStyle.setProperty('--muted', colors.muted);
    bodyStyle.setProperty('--border', colors.border);
    bodyStyle.setProperty('--input-bg', colors.inputBg);
    bodyStyle.setProperty('--card-bg', colors.bg);
  } else {
    bodyStyle.removeProperty('--text');
    bodyStyle.removeProperty('--muted');
    bodyStyle.removeProperty('--border');
    bodyStyle.removeProperty('--input-bg');
    bodyStyle.removeProperty('--card-bg');
  }

  // Determine if theme is dark based on background luminance
  const isDark = isColorDark(colors.bg);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Set color-scheme for native inputs (calendar, etc.)
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

/**
 * Check if a hex color is dark
 * @param {string} hex - Hex color string
 * @returns {boolean} True if color is dark
 */
function isColorDark(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * Gets background image from local storage
 * @returns {Promise<string|null>} Base64 image data or null
 */
async function getBackgroundImage() {
  const { bgImage = null } = await chrome.storage.local.get({ bgImage: null });
  return bgImage;
}

/**
 * Saves background image to local storage
 * @param {string|null} imageData - Base64 image data or null to remove
 */
async function setBackgroundImage(imageData) {
  if (imageData) {
    await chrome.storage.local.set({ bgImage: imageData });
  } else {
    await chrome.storage.local.remove('bgImage');
  }
}

/**
 * Applies background image to body
 * @param {string|null} imageData - Base64 image data or null
 */
function applyBackgroundImage(imageData) {
  if (imageData) {
    document.body.style.backgroundImage = `url(${imageData})`;
    document.body.classList.add('has-bg-image');
  } else {
    document.body.style.backgroundImage = '';
    document.body.classList.remove('has-bg-image');
  }
}

/**
 * Gets cached share link from storage
 * @returns {Promise<{url: string, targetIso: string}|null>} Cached link data
 */
async function getCachedShareLink() {
  const { shareLink = null } = await chrome.storage.sync.get({ shareLink: null });
  return shareLink;
}

/**
 * Caches a share link for a specific target
 * @param {string} url - Share URL
 * @param {string} targetIso - ISO string of target this link is for
 */
async function setCachedShareLink(url, targetIso) {
  await chrome.storage.sync.set({ shareLink: { url, targetIso } });
}

// =============================================================================
// Sound Functions
// =============================================================================

/**
 * Plays a two-beep alert sound using Web Audio API
 */
function playAlertSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Play two beeps with 200ms gap
  [0, 0.2].forEach((delay) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 880; // A5 note
    oscillator.type = "sine";

    // Fade out the beep
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);

    oscillator.start(audioCtx.currentTime + delay);
    oscillator.stop(audioCtx.currentTime + delay + 0.15);
  });
}

// =============================================================================
// Countdown Functions
// =============================================================================

/**
 * Updates the countdown display
 * @param {Date} targetDate - Target date to count down to
 * @param {boolean} soundEnabled - Whether sound is enabled
 * @param {string} isoLocal - ISO string of target (for sound tracking)
 * @param {string} soundPlayedFor - ISO string of target sound was already played for
 */
async function updateCountdown(targetDate, soundEnabled, isoLocal, soundPlayedFor) {
  const now = new Date();
  const diffMs = targetDate - now;

  // Countdown finished - count up to show elapsed time
  if (diffMs <= 0) {
    const elapsedMs = Math.abs(diffMs);
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    hh.textContent = pad2(hours);
    mm.textContent = pad2(minutes);
    ss.textContent = pad2(seconds);
    statusText.textContent = "✅ Time's up!";

    // Play sound once when countdown ends
    if (soundEnabled && soundPlayedFor !== isoLocal) {
      playAlertSound();
      await setSoundPlayedFor(isoLocal);
    }
    return;
  }

  statusText.textContent = "";

  // Calculate hours, minutes, seconds
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  hh.textContent = pad2(hours);
  mm.textContent = pad2(minutes);
  ss.textContent = pad2(seconds);
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
}

// =============================================================================
// Main Initialization
// =============================================================================

async function init() {
  // Load saved settings
  let isoLocal = await getTargetIsoLocal();
  let targetDate = isoLocalToDate(isoLocal);
  let soundEnabled = await getSoundEnabled();
  let soundPlayedFor = await getSoundPlayedFor();
  let pomodoroState = null;
  let pomodoroSettings = { ...DEFAULT_POMODORO_SETTINGS };
  let lastPomodoroTransitionAt = 0;
  let hasInitializedPomodoroState = false;
  let isPomodoroDrawerOpen = false;
  let isPomodoroSetupOpen = false;
  let pomodoroToastHideTimer = null;
  let pomodoroToastCleanupTimer = null;
  let themeId = await getThemeId();
  let clockFontId = await getClockFontId();
  let textFontId = await getTextFontId();
  let customTheme = await getCustomTheme();
  let premium = await isPremium();
  let bgImage = await getBackgroundImage();

  // Apply theme immediately
  applyTheme(themeId, customTheme);
  applyFontPreferences(clockFontId, textFontId, premium);

  // Apply background image if set
  if (bgImage) {
    applyBackgroundImage(bgImage);
  }

  // Display target date
  targetText.textContent = `Target: ${formatLocal(targetDate)}`;

  function setPomodoroDrawerOpen(nextOpen) {
    isPomodoroDrawerOpen = Boolean(nextOpen);
    if (!isPomodoroDrawerOpen) {
      setPomodoroSetupOpen(false);
    }
    if (pomoDrawer) {
      pomoDrawer.classList.toggle("open", isPomodoroDrawerOpen);
    }
    if (pomoToggleBtn) {
      pomoToggleBtn.classList.toggle("open", isPomodoroDrawerOpen);
      pomoToggleBtn.setAttribute("aria-expanded", String(isPomodoroDrawerOpen));
    }
  }

  function promptPremiumForPomodoro() {
    licenseModal?.classList.remove("hidden");
    licenseInput?.focus();
  }

  function ensurePomodoroPremiumAccess() {
    if (premium) return true;
    promptPremiumForPomodoro();
    return false;
  }

  function setPomodoroSetupOpen(nextOpen) {
    isPomodoroSetupOpen = Boolean(nextOpen);
    if (pomoMainView) {
      pomoMainView.classList.toggle("hidden", isPomodoroSetupOpen);
    }
    if (pomoSetupView) {
      pomoSetupView.classList.toggle("hidden", !isPomodoroSetupOpen);
    }
    if (pomoSetupBtn) {
      pomoSetupBtn.textContent = isPomodoroSetupOpen ? "Back" : "Setup";
    }
    if (pomoSetupError) {
      pomoSetupError.classList.add("hidden");
      pomoSetupError.textContent = "";
    }
  }

  function applyPomodoroSettings(nextSettings) {
    if (!nextSettings) return;
    pomodoroSettings = { ...DEFAULT_POMODORO_SETTINGS, ...nextSettings };
  }

  function populatePomodoroSetupInputs() {
    if (pomoFocusInput) pomoFocusInput.value = String(pomodoroSettings.focusMinutes);
    if (pomoShortBreakInput) pomoShortBreakInput.value = String(pomodoroSettings.shortBreakMinutes);
    if (pomoLongBreakInput) pomoLongBreakInput.value = String(pomodoroSettings.longBreakMinutes);
    if (pomoLongEveryInput) pomoLongEveryInput.value = String(pomodoroSettings.longBreakEvery);
    if (pomoRunIntervalsInput) pomoRunIntervalsInput.value = String(pomodoroSettings.runIntervals);
    if (pomoSoundToggleInput) pomoSoundToggleInput.checked = pomodoroSettings.pomodoroSoundEnabled !== false;
  }

  function readPomodoroSetupInputs() {
    return {
      focusMinutes: Number(pomoFocusInput?.value),
      shortBreakMinutes: Number(pomoShortBreakInput?.value),
      longBreakMinutes: Number(pomoLongBreakInput?.value),
      longBreakEvery: Number(pomoLongEveryInput?.value),
      runIntervals: Number(pomoRunIntervalsInput?.value),
      pomodoroSoundEnabled: Boolean(pomoSoundToggleInput?.checked)
    };
  }

  function validatePomodoroSettings(candidate) {
    if (!Number.isInteger(candidate.focusMinutes) || candidate.focusMinutes < 1 || candidate.focusMinutes > 180) {
      return "Focus must be between 1 and 180 minutes.";
    }
    if (!Number.isInteger(candidate.shortBreakMinutes) || candidate.shortBreakMinutes < 1 || candidate.shortBreakMinutes > 60) {
      return "Short break must be between 1 and 60 minutes.";
    }
    if (!Number.isInteger(candidate.longBreakMinutes) || candidate.longBreakMinutes < 1 || candidate.longBreakMinutes > 120) {
      return "Long break must be between 1 and 120 minutes.";
    }
    if (!Number.isInteger(candidate.longBreakEvery) || candidate.longBreakEvery < 2 || candidate.longBreakEvery > 12) {
      return "Long break frequency must be between 2 and 12 sessions.";
    }
    if (!Number.isInteger(candidate.runIntervals) || candidate.runIntervals < 1 || candidate.runIntervals > 30) {
      return "Run intervals must be between 1 and 30.";
    }
    return null;
  }

  function getPhaseToastMessage(state) {
    if (state?.status === "stopped" && state?.stopReason === "completed") {
      return "Pomodoro intervals complete";
    }
    if (state?.phase === "shortBreak") return "Short break started";
    if (state?.phase === "longBreak") return "Long break started";
    return "Focus started";
  }

  function showPomodoroToast(message) {
    if (!pomoToast) return;

    if (pomodoroToastHideTimer) clearTimeout(pomodoroToastHideTimer);
    if (pomodoroToastCleanupTimer) clearTimeout(pomodoroToastCleanupTimer);

    pomoToast.textContent = message;
    pomoToast.classList.remove("hidden", "show", "hiding");
    // Force reflow so re-showing the same toast still animates.
    void pomoToast.offsetWidth;
    pomoToast.classList.add("show");

    pomodoroToastHideTimer = setTimeout(() => {
      pomoToast.classList.remove("show");
      pomoToast.classList.add("hiding");
      pomodoroToastCleanupTimer = setTimeout(() => {
        pomoToast.classList.add("hidden");
        pomoToast.classList.remove("hiding");
      }, 260);
    }, 3000);
  }

  function applyPomodoroState(nextState, allowPhaseToast = false) {
    if (!nextState) return;
    pomodoroState = nextState;
    renderPomodoro(pomodoroState, pomodoroSettings);

    if (nextState.status === "stopped" && nextState.stopReason === "completed") {
      setPomodoroSetupOpen(false);
    }

    const wasInitialized = hasInitializedPomodoroState;
    hasInitializedPomodoroState = true;

    const nextTransitionAt = Number(nextState.lastTransitionAt || 0);
    if (nextTransitionAt && nextTransitionAt !== lastPomodoroTransitionAt) {
      lastPomodoroTransitionAt = nextTransitionAt;
      const shouldShowToast = premium && (nextState.isRunning || nextState.stopReason === "completed");
      const shouldPlaySound =
        shouldShowToast && soundEnabled && pomodoroSettings.pomodoroSoundEnabled !== false;
      if (allowPhaseToast && wasInitialized && shouldPlaySound) {
        try {
          playAlertSound();
        } catch (e) {
          console.error("Pomodoro sound alert failed:", e);
        }
      }
      if (allowPhaseToast && wasInitialized && shouldShowToast) {
        showPomodoroToast(getPhaseToastMessage(nextState));
      }
    }
  }

  function applyPomodoroResponse(response, allowPhaseToast = false) {
    if (response?.settings) {
      applyPomodoroSettings(response.settings);
    }
    if (response?.state) {
      applyPomodoroState(response.state, allowPhaseToast);
    }
  }

  async function refreshPomodoroState(allowPhaseToast = false) {
    const response = await sendPomodoroMessage("pomodoro:getState");
    if (response?.ok && response.state) {
      applyPomodoroResponse(response, allowPhaseToast);
    } else {
      if (response?.error) {
        console.error("Pomodoro state fetch failed:", response.error);
      }
      renderPomodoro(pomodoroState, pomodoroSettings);
      if (pomoStatus && response?.error) {
        pomoStatus.textContent = "Worker unavailable";
      }
    }
  }

  await refreshPomodoroState(false);
  setPomodoroDrawerOpen(false);
  setPomodoroSetupOpen(false);

  // Start countdown ticker (updates every 250ms for smooth display)
  const tick = () => {
    renderPomodoro(pomodoroState, pomodoroSettings);
    updateCountdown(targetDate, soundEnabled, isoLocal, soundPlayedFor).then(() => {
      if (soundPlayedFor !== isoLocal) {
        getSoundPlayedFor().then(val => soundPlayedFor = val);
      }
    });
  };
  tick();
  setInterval(tick, 250);

  // Keep UI in sync when background worker updates Pomodoro state.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.pomodoroSettings?.newValue) {
      applyPomodoroSettings(changes.pomodoroSettings.newValue);
      if (isPomodoroSetupOpen) {
        populatePomodoroSetupInputs();
      }
    }
    if (changes.pomodoroState?.newValue) {
      applyPomodoroState(changes.pomodoroState.newValue, true);
    }
  });

  pomoToggleBtn?.addEventListener("click", () => {
    if (!ensurePomodoroPremiumAccess()) return;
    setPomodoroDrawerOpen(!isPomodoroDrawerOpen);
  });

  pomoSetupBtn?.addEventListener("click", () => {
    if (!ensurePomodoroPremiumAccess()) return;
    const nextOpen = !isPomodoroSetupOpen;
    setPomodoroSetupOpen(nextOpen);
    if (nextOpen) {
      populatePomodoroSetupInputs();
    }
  });

  pomoSetupCancelBtn?.addEventListener("click", () => {
    setPomodoroSetupOpen(false);
  });

  pomoSetupView?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ensurePomodoroPremiumAccess()) return;

    const candidate = readPomodoroSetupInputs();
    const validationError = validatePomodoroSettings(candidate);
    if (validationError) {
      if (pomoSetupError) {
        pomoSetupError.textContent = validationError;
        pomoSetupError.classList.remove("hidden");
      }
      return;
    }

    const saveBtn = $("pomoSetupSaveBtn");
    if (saveBtn) saveBtn.disabled = true;

    const response = await sendPomodoroMessage("pomodoro:updateSettings", { settings: candidate });
    if (response?.ok) {
      applyPomodoroResponse(response, false);
      setPomodoroSetupOpen(false);
    } else if (pomoSetupError) {
      if (response?.error) {
        console.error("Pomodoro settings update failed:", response.error);
      }
      pomoSetupError.textContent = response?.error || "Unable to save settings.";
      pomoSetupError.classList.remove("hidden");
    }

    if (saveBtn) saveBtn.disabled = false;
  });

  pomoStartPauseBtn?.addEventListener("click", async () => {
    if (!ensurePomodoroPremiumAccess()) return;
    pomoStartPauseBtn.disabled = true;
    const response = await sendPomodoroMessage("pomodoro:toggle");
    if (response?.ok && response.state) {
      applyPomodoroResponse(response, false);
    } else if (pomoStatus) {
      if (response?.error) {
        console.error("Pomodoro start/pause failed:", response.error);
      }
      pomoStatus.textContent = "Start failed";
    }
    pomoStartPauseBtn.disabled = false;
  });

  pomoResetBtn?.addEventListener("click", async () => {
    if (!ensurePomodoroPremiumAccess()) return;
    pomoResetBtn.disabled = true;
    const response = await sendPomodoroMessage("pomodoro:reset");
    if (response?.ok && response.state) {
      applyPomodoroResponse(response, false);
    } else if (pomoStatus) {
      if (response?.error) {
        console.error("Pomodoro reset failed:", response.error);
      }
      pomoStatus.textContent = "Reset failed";
    }
    pomoResetBtn.disabled = false;
  });

  pomoSkipBtn?.addEventListener("click", async () => {
    if (!ensurePomodoroPremiumAccess()) return;
    pomoSkipBtn.disabled = true;
    const response = await sendPomodoroMessage("pomodoro:skip");
    if (response?.ok && response.state) {
      applyPomodoroResponse(response, false);
    } else if (pomoStatus) {
      if (response?.error) {
        console.error("Pomodoro skip failed:", response.error);
      }
      pomoStatus.textContent = "Skip failed";
    }
    pomoSkipBtn.disabled = false;
  });

  pomoStopBtn?.addEventListener("click", async () => {
    if (!ensurePomodoroPremiumAccess()) return;
    pomoStopBtn.disabled = true;
    const response = await sendPomodoroMessage("pomodoro:stop");
    if (response?.ok && response.state) {
      applyPomodoroResponse(response, false);
      setPomodoroSetupOpen(false);
    } else if (pomoStatus) {
      if (response?.error) {
        console.error("Pomodoro stop failed:", response.error);
      }
      pomoStatus.textContent = "Stop failed";
    }
    pomoStopBtn.disabled = false;
  });

  // ---------------------------------------------------------------------------
  // Date Modal Event Handlers
  // ---------------------------------------------------------------------------

  // Save and close date modal
  async function saveDateAndClose() {
    const val = dtInput.value?.trim();
    if (val && val !== isoLocal) {
      isoLocal = val;
      await setTargetIsoLocal(isoLocal);
      targetDate = isoLocalToDate(isoLocal);
      targetText.textContent = `Target: ${formatLocal(targetDate)}`;
    }
    dateModal.classList.add("hidden");
  }

  // Open date modal when clicking target text
  targetText.addEventListener("click", () => {
    dtInput.value = isoLocal;
    dateModal.classList.remove("hidden");
    dtInput.focus();
  });

  // Save and close when clicking outside
  dateModal.addEventListener("click", (e) => {
    if (e.target === dateModal) saveDateAndClose();
  });

  // ---------------------------------------------------------------------------
  // Settings Modal Event Handlers
  // ---------------------------------------------------------------------------

  // Color picker elements
  const customColorPicker = $("customColorPicker");
  const colorBg = $("colorBg");
  const colorText = $("colorText");
  const colorMuted = $("colorMuted");
  const colorBorder = $("colorBorder");
  const customPreview = $("customPreview");

  function populateFontOptions() {
    const presets = Object.values(FONT_PRESETS);
    [clockFontSelect, textFontSelect].forEach((select) => {
      if (!select) return;
      select.innerHTML = "";
      presets.forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.premium ? `${preset.name} (Premium)` : preset.name;
        select.append(option);
      });
    });
  }

  function syncFontUI() {
    const { appliedClockId, appliedTextId } = applyFontPreferences(clockFontId, textFontId, premium);
    if (clockFontSelect) clockFontSelect.value = appliedClockId;
    if (textFontSelect) textFontSelect.value = appliedTextId;
  }

  function promptPremiumForFonts() {
    licenseModal?.classList.remove("hidden");
    licenseInput?.focus();
  }

  // Update custom preview gradient based on custom colors
  function updateCustomPreview() {
    if (customTheme) {
      customPreview.style.background = `linear-gradient(135deg, ${customTheme.bg} 0%, ${customTheme.text} 100%)`;
    }
  }

  // Update premium UI
  function updatePremiumUI() {
    if (premium) {
      $("premiumBanner")?.classList.remove("hidden");
      $("upgradeBanner")?.classList.add("hidden");
    } else {
      $("premiumBanner")?.classList.add("hidden");
      $("upgradeBanner")?.classList.remove("hidden");
    }

    // Update theme preset buttons
    document.querySelectorAll(".theme-preset").forEach(btn => {
      const presetId = btn.dataset.theme;
      const preset = THEME_PRESETS[presetId];
      const isLocked = preset?.premium && !premium;

      btn.classList.toggle("locked", isLocked);
      btn.classList.toggle("active", presetId === themeId);

      const lockIcon = btn.querySelector(".lock-icon");
      if (lockIcon) {
        lockIcon.style.display = isLocked ? "inline" : "none";
      }
    });

    // Show/hide color picker based on theme and premium status
    if (themeId === 'custom' && premium) {
      customColorPicker?.classList.remove("hidden");
      // Populate color inputs
      if (customTheme) {
        colorBg.value = customTheme.bg;
        colorText.value = customTheme.text;
        colorMuted.value = customTheme.muted;
        colorBorder.value = customTheme.border;
      }
    } else {
      customColorPicker?.classList.add("hidden");
    }

    if (fontSection) {
      fontSection.classList.toggle("locked", !premium);
    }
    if (fontLock) {
      fontLock.style.display = premium ? "none" : "inline";
    }
    if (clockFontSelect) {
      clockFontSelect.disabled = !premium;
    }
    if (textFontSelect) {
      textFontSelect.disabled = !premium;
    }
    syncFontUI();

    if (pomoToggleBtn) {
      pomoToggleBtn.classList.toggle("hidden", !premium);
    }
    if (!premium) {
      setPomodoroDrawerOpen(false);
    }

    updateCustomPreview();
  }

  populateFontOptions();

  // Apply lock state immediately on page load.
  updatePremiumUI();

  // Open settings modal
  settingsBtn.addEventListener("click", async () => {
    soundToggle.checked = soundEnabled;
    // Refresh premium status from storage
    premium = await isPremium();
    updatePremiumUI();
    updateBgImageUI();
    settingsModal.classList.remove("hidden");
  });

  // Auto-save sound toggle
  soundToggle.addEventListener("change", async () => {
    soundEnabled = soundToggle.checked;
    await setSoundEnabled(soundEnabled);
  });

  clockFontSelect?.addEventListener("change", async () => {
    if (!premium) {
      syncFontUI();
      promptPremiumForFonts();
      return;
    }

    clockFontId = normalizeFontId(clockFontSelect.value);
    await setClockFontId(clockFontId);
    syncFontUI();
  });

  textFontSelect?.addEventListener("change", async () => {
    if (!premium) {
      syncFontUI();
      promptPremiumForFonts();
      return;
    }

    textFontId = normalizeFontId(textFontSelect.value);
    await setTextFontId(textFontId);
    syncFontUI();
  });

  // Theme preset clicks
  document.querySelectorAll(".theme-preset").forEach(btn => {
    btn.addEventListener("click", async () => {
      const presetId = btn.dataset.theme;
      const preset = THEME_PRESETS[presetId];

      // Check if premium theme and user is not premium
      if (preset?.premium && !premium) {
        // Open license modal
        licenseModal.classList.remove("hidden");
        licenseInput.focus();
        return;
      }

      // If selecting custom and no custom theme exists, create default
      if (presetId === 'custom' && !customTheme) {
        customTheme = {
          bg: '#1a1a1a',
          text: '#f5f5f3',
          muted: '#888888',
          border: '#333333',
          inputBg: '#2a2a2a'
        };
        await setCustomTheme(customTheme);
      }

      themeId = presetId;
      await setThemeId(themeId);
      applyTheme(themeId, customTheme);
      updatePremiumUI();
    });
  });

  // Color input change handlers
  async function handleColorChange() {
    customTheme = {
      bg: colorBg.value,
      text: colorText.value,
      muted: colorMuted.value,
      border: colorBorder.value,
      inputBg: colorBg.value  // Use bg as inputBg base
    };
    await setCustomTheme(customTheme);
    applyTheme('custom', customTheme);
    updateCustomPreview();
  }

  colorBg?.addEventListener("input", handleColorChange);
  colorText?.addEventListener("input", handleColorChange);
  colorMuted?.addEventListener("input", handleColorChange);
  colorBorder?.addEventListener("input", handleColorChange);

  // ---------------------------------------------------------------------------
  // Background Image Elements & UI
  // ---------------------------------------------------------------------------

  const bgImageInput = $("bgImageInput");
  const bgImageLabel = $("bgImageLabel");
  const bgImageRemove = $("bgImageRemove");
  const bgImageLock = $("bgImageLock");

  // Crop modal elements
  const cropModal = $("cropModal");
  const cropImage = $("cropImage");
  const cropApplyBtn = $("cropApplyBtn");
  const cropCancelBtn = $("cropCancelBtn");
  let cropper = null;

  // Update background image UI based on premium status
  function updateBgImageUI() {
    const isLocked = !premium;

    if (bgImageLabel) {
      bgImageLabel.classList.toggle("locked", isLocked);
    }
    if (bgImageLock) {
      bgImageLock.style.display = isLocked ? "inline" : "none";
    }
    if (bgImageRemove) {
      bgImageRemove.classList.toggle("hidden", !bgImage);
    }
  }

  // Close crop modal helper
  function closeCropModal() {
    cropModal.classList.add("hidden");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    cropImage.src = "";
  }

  // Handle background image upload - show crop modal
  bgImageInput?.addEventListener("change", async (e) => {
    if (!premium) {
      licenseModal.classList.remove("hidden");
      licenseInput.focus();
      bgImageInput.value = "";
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      bgImageInput.value = "";
      return;
    }

    // Load image and show crop modal
    const reader = new FileReader();
    reader.onload = (event) => {
      cropImage.src = event.target.result;
      cropModal.classList.remove("hidden");

      // Initialize Cropper.js after image loads
      cropImage.onload = () => {
        if (cropper) {
          cropper.destroy();
        }
        cropper = new Cropper(cropImage, {
          aspectRatio: NaN, // Free aspect ratio
          viewMode: 2, // Restrict image to fit within container, show full image
          dragMode: 'crop',
          autoCropArea: 1, // Select entire image by default
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
          minContainerWidth: 200,
          minContainerHeight: 200
        });
      };
    };
    reader.readAsDataURL(file);
    bgImageInput.value = "";
  });

  // Crop apply button
  cropApplyBtn?.addEventListener("click", async () => {
    if (!cropper) return;

    // Get the cropped canvas at full resolution first
    const croppedCanvas = cropper.getCroppedCanvas();

    if (!croppedCanvas) {
      closeCropModal();
      return;
    }

    // Scale down if too large (max 1920px on longest side)
    const maxDimension = 1920;
    let finalCanvas = croppedCanvas;

    if (croppedCanvas.width > maxDimension || croppedCanvas.height > maxDimension) {
      const scale = Math.min(maxDimension / croppedCanvas.width, maxDimension / croppedCanvas.height);
      const newWidth = Math.round(croppedCanvas.width * scale);
      const newHeight = Math.round(croppedCanvas.height * scale);

      finalCanvas = document.createElement('canvas');
      finalCanvas.width = newWidth;
      finalCanvas.height = newHeight;
      const ctx = finalCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(croppedCanvas, 0, 0, newWidth, newHeight);
    }

    // Convert to JPEG at 85% quality
    bgImage = finalCanvas.toDataURL("image/jpeg", 0.85);
    await setBackgroundImage(bgImage);
    applyBackgroundImage(bgImage);
    updateBgImageUI();

    closeCropModal();
  });

  // Crop cancel button
  cropCancelBtn?.addEventListener("click", closeCropModal);

  // Close crop modal on backdrop click
  cropModal?.addEventListener("click", (e) => {
    if (e.target === cropModal) closeCropModal();
  });

  // Handle background image removal
  bgImageRemove?.addEventListener("click", async () => {
    bgImage = null;
    await setBackgroundImage(null);
    applyBackgroundImage(null);
    updateBgImageUI();
  });

  // ---------------------------------------------------------------------------
  // License Modal Event Handlers
  // ---------------------------------------------------------------------------

  // Upgrade button opens license modal
  $("upgradeBtn")?.addEventListener("click", () => {
    licenseModal.classList.remove("hidden");
    licenseInput.focus();
  });

  // Activate license
  activateBtn?.addEventListener("click", async () => {
    const key = licenseInput.value.trim();
    if (!key) {
      licenseError.textContent = "Please enter a license key";
      licenseError.classList.remove("hidden");
      return;
    }

    activateBtn.disabled = true;
    activateBtn.textContent = "Activating...";
    licenseError.classList.add("hidden");

    const result = await activateLicense(key);

    if (result.success) {
      premium = true;
      licenseModal.classList.add("hidden");
      licenseInput.value = "";
      updatePremiumUI();
      updateBgImageUI();
    } else {
      licenseError.textContent = result.error || "Activation failed";
      licenseError.classList.remove("hidden");
    }

    activateBtn.disabled = false;
    activateBtn.textContent = "Activate";
  });

  // Close license modal on backdrop click
  licenseModal?.addEventListener("click", (e) => {
    if (e.target === licenseModal) {
      licenseModal.classList.add("hidden");
      licenseError.classList.add("hidden");
    }
  });

  // ---------------------------------------------------------------------------
  // Share Countdown Handler
  // ---------------------------------------------------------------------------

  shareBtn.addEventListener("click", async () => {
    shareBtn.disabled = true;
    shareStatus.textContent = "";

    try {
      // Check if we have a cached link for this target date
      const cached = await getCachedShareLink();
      let shareUrl;

      if (cached && cached.targetIso === isoLocal) {
        // Reuse cached link (same target date)
        shareUrl = cached.url;
      } else {
        // Create new share link via Cloudflare Worker
        const res = await fetch(`${WORKER_URL}/api/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: targetDate.toISOString(),
            title: "Every Second Counts"
          })
        });

        const data = await res.json();

        // Handle rate limit
        if (res.status === 429) {
          const mins = data.retryAfterMinutes || 60;
          shareStatus.textContent = `Limit reached. Try in ${mins} min`;
          setTimeout(() => {
            shareStatus.textContent = "";
          }, 3000);
          shareBtn.disabled = false;
          return;
        }

        if (data.url) {
          shareUrl = data.url;
          // Cache the link for future clicks
          await setCachedShareLink(shareUrl, isoLocal);
        }
      }

      // Copy to clipboard and show confirmation
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        shareStatus.textContent = "Copied!";
        setTimeout(() => {
          shareStatus.textContent = "";
        }, 1500);
      } else {
        shareStatus.textContent = "Failed";
        setTimeout(() => {
          shareStatus.textContent = "";
        }, 2000);
      }
    } catch (e) {
      shareStatus.textContent = "Error";
      setTimeout(() => {
        shareStatus.textContent = "";
      }, 2000);
    }

    shareBtn.disabled = false;
  });

  // Close settings on backdrop click
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  // ---------------------------------------------------------------------------
  // Keyboard Shortcuts
  // ---------------------------------------------------------------------------

  // Escape to close any open modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!dateModal.classList.contains("hidden")) saveDateAndClose();
      if (!settingsModal.classList.contains("hidden")) closeSettingsModal();
      if (isPomodoroDrawerOpen) setPomodoroDrawerOpen(false);
      if (licenseModal && !licenseModal.classList.contains("hidden")) {
        licenseModal.classList.add("hidden");
        licenseError?.classList.add("hidden");
      }
      if (cropModal && !cropModal.classList.contains("hidden")) {
        closeCropModal();
      }
    }
  });
}

// Start the app
init();
