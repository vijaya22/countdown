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
const settingsProBadge = $("settingsProBadge");
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

// =============================================================================
// Multi-Countdown Storage
// =============================================================================

function generateId() {
  return crypto.randomUUID();
}

function createDefaultCountdown(label, targetIsoLocal, isMain) {
  return {
    id: generateId(),
    label: label || '',
    targetIsoLocal: targetIsoLocal || getTodayEOD(),
    themeId: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    customColors: null,
    clockFontId: 'default',
    textFontId: 'default',
    isMain: Boolean(isMain),
    shareLink: null
  };
}

async function getCountdowns() {
  const { countdowns = null } = await chrome.storage.sync.get({ countdowns: null });
  return countdowns;
}

async function saveCountdowns(arr) {
  await chrome.storage.sync.set({ countdowns: arr });
}

function getMainCountdown(arr) {
  return arr.find(c => c.isMain) || arr[0];
}

function setMainCountdown(arr, id) {
  arr.forEach(c => { c.isMain = (c.id === id); });
}

async function getBgImages() {
  const { bgImages = {} } = await chrome.storage.local.get({ bgImages: {} });
  return bgImages;
}

async function saveBgImage(id, data) {
  const bgImages = await getBgImages();
  bgImages[id] = data;
  await chrome.storage.local.set({ bgImages });
}

async function removeBgImage(id) {
  const bgImages = await getBgImages();
  delete bgImages[id];
  await chrome.storage.local.set({ bgImages });
}

async function migrateStorageIfNeeded() {
  const existing = await getCountdowns();
  if (existing !== null) return;

  // Read all legacy flat keys
  const syncData = await chrome.storage.sync.get({
    targetIsoLocal: null,
    themeId: null,
    darkMode: null,
    customTheme: null,
    clockFontId: 'default',
    textFontId: 'default',
    shareLink: null
  });
  const { bgImage = null } = await chrome.storage.local.get({ bgImage: null });

  // Determine theme from old keys
  let themeId = syncData.themeId;
  if (!themeId) {
    if (syncData.darkMode !== null) {
      themeId = syncData.darkMode ? 'dark' : 'light';
    } else {
      themeId = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  }

  const countdown = {
    id: generateId(),
    label: '',
    targetIsoLocal: syncData.targetIsoLocal || getTodayEOD(),
    themeId,
    customColors: syncData.customTheme || null,
    clockFontId: normalizeFontId(syncData.clockFontId),
    textFontId: normalizeFontId(syncData.textFontId),
    isMain: true,
    shareLink: syncData.shareLink || null
  };

  await saveCountdowns([countdown]);

  if (bgImage) {
    await saveBgImage(countdown.id, bgImage);
    await chrome.storage.local.remove('bgImage');
  }

  // Clean up legacy keys
  await chrome.storage.sync.remove([
    'targetIsoLocal', 'themeId', 'darkMode', 'customTheme',
    'clockFontId', 'textFontId', 'shareLink'
  ]);
}

// =============================================================================
// Global storage helpers (not per-countdown)
// =============================================================================

async function getSoundEnabled() {
  const { soundEnabled = true } = await chrome.storage.sync.get({ soundEnabled: true });
  return soundEnabled;
}

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

async function getSoundPlayedFor() {
  const { soundPlayedFor = null } = await chrome.storage.sync.get({ soundPlayedFor: null });
  return soundPlayedFor;
}

async function setSoundPlayedFor(targetIso) {
  await chrome.storage.sync.set({ soundPlayedFor: targetIso });
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

// =============================================================================
// Sound Functions
// =============================================================================

/**
 * Plays a two-beep alert sound using Web Audio API
 */
let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playAlertSound() {
  const audioCtx = getAudioContext();
  const startAt = audioCtx.currentTime;

  // Play two beeps with 200ms gap
  [0, 0.2].forEach((delay) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 880; // A5 note
    oscillator.type = "sine";

    // Fade out the beep
    gainNode.gain.setValueAtTime(0.3, startAt + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + delay + 0.15);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };

    oscillator.start(startAt + delay);
    oscillator.stop(startAt + delay + 0.15);
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
 * @returns {boolean} True when countdown-end sound was triggered this tick
 */
function updateCountdown(targetDate, soundEnabled, isoLocal, soundPlayedFor) {
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

    // Track and play sound once when countdown ends
    if (soundPlayedFor !== isoLocal) {
      track(ANALYTICS_EVENTS.COUNTDOWN_COMPLETED);
      if (soundEnabled) playAlertSound();
      setSoundPlayedFor(isoLocal);
      return true;
    }
    return false;
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
  return false;
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
  settingsBtn?.classList.remove("hidden");
  settingsBtn?.setAttribute("aria-expanded", "false");
}

// =============================================================================
// Main Initialization
// =============================================================================

async function init() {
  // Migrate legacy flat-key storage to countdowns array if needed
  await migrateStorageIfNeeded();

  // Load countdowns array
  let countdowns = await getCountdowns() || [];
  if (countdowns.length === 0) {
    countdowns = [createDefaultCountdown('', getTodayEOD(), true)];
    await saveCountdowns(countdowns);
  }
  let mainCountdown = getMainCountdown(countdowns);

  // Derive per-countdown settings from main
  let isoLocal = mainCountdown.targetIsoLocal;
  let targetDate = isoLocalToDate(isoLocal);
  let themeId = mainCountdown.themeId;
  let clockFontId = mainCountdown.clockFontId || 'default';
  let textFontId = mainCountdown.textFontId || 'default';
  let customTheme = mainCountdown.customColors;

  // Load global settings
  let soundEnabled = await getSoundEnabled();
  let soundPlayedFor = await getSoundPlayedFor();
  let premium = await isPremium();

  // Load background images
  let bgImages = await getBgImages();
  let bgImage = bgImages[mainCountdown.id] || null;

  let pomodoroState = null;
  let pomodoroSettings = { ...DEFAULT_POMODORO_SETTINGS };
  let lastPomodoroTransitionAt = 0;
  let hasInitializedPomodoroState = false;
  let isPomodoroDrawerOpen = false;
  let isPomodoroSetupOpen = false;
  let pomodoroToastHideTimer = null;
  let pomodoroToastCleanupTimer = null;
  let hasPlayedSettingsAttention = false;
  let settingsAttentionTimer = null;

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
    const shouldPersistSound = updateCountdown(targetDate, soundEnabled, isoLocal, soundPlayedFor);
    if (shouldPersistSound) {
      // Update local guard immediately so repeated ticks don't retrigger sound.
      soundPlayedFor = isoLocal;
      void setSoundPlayedFor(isoLocal).catch((e) => {
        console.error("Failed to persist soundPlayedFor:", e);
      });
    }
  };
  tick();
  setInterval(tick, 250);

  // Keep UI in sync when background worker updates Pomodoro state or countdowns change.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      if (changes.pomodoroSettings?.newValue) {
        applyPomodoroSettings(changes.pomodoroSettings.newValue);
        if (isPomodoroSetupOpen) populatePomodoroSetupInputs();
      }
      if (changes.pomodoroState?.newValue) {
        applyPomodoroState(changes.pomodoroState.newValue, true);
      }
    }
    if (areaName === "sync" && changes.countdowns?.newValue) {
      const updated = changes.countdowns.newValue;
      if (!updated) return;
      countdowns = updated;
      const newMain = getMainCountdown(countdowns);
      if (newMain.id !== mainCountdown.id || newMain.targetIsoLocal !== mainCountdown.targetIsoLocal) {
        mainCountdown = newMain;
        isoLocal = mainCountdown.targetIsoLocal;
        targetDate = isoLocalToDate(isoLocal);
        themeId = mainCountdown.themeId;
        clockFontId = mainCountdown.clockFontId || 'default';
        textFontId = mainCountdown.textFontId || 'default';
        customTheme = mainCountdown.customColors;
        applyTheme(themeId, customTheme);
        applyFontPreferences(clockFontId, textFontId, premium);
        targetText.textContent = `Target: ${formatLocal(targetDate)}`;
      }
      updateLayoutMode();
      renderCardGrid();
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
      track(ANALYTICS_EVENTS.POMODORO_CONFIGURED, {
        focus_min: candidate.focusMinutes,
        short_break_min: candidate.shortBreakMinutes,
        long_break_min: candidate.longBreakMinutes,
        long_break_every: candidate.longBreakEvery,
        run_intervals: candidate.runIntervals
      });
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
      track(response.state.isRunning ? ANALYTICS_EVENTS.POMODORO_STARTED : ANALYTICS_EVENTS.POMODORO_PAUSED);
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
      track(ANALYTICS_EVENTS.POMODORO_RESET);
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
      track(ANALYTICS_EVENTS.POMODORO_SKIPPED);
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
      track(ANALYTICS_EVENTS.POMODORO_STOPPED);
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
      mainCountdown.targetIsoLocal = isoLocal;
      await saveCountdowns(countdowns);
      targetDate = isoLocalToDate(isoLocal);
      targetText.textContent = `Target: ${formatLocal(targetDate)}`;
      const daysUntil = Math.ceil((targetDate - new Date()) / 86400000);
      track(ANALYTICS_EVENTS.COUNTDOWN_SET, { days_until_target: daysUntil });
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
    [clockFontSelect, textFontSelect, $("editClockFontSelect"), $("editTextFontSelect")].forEach((select) => {
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
    settingsProBadge?.classList.toggle("hidden", premium);
    settingsBtn?.classList.toggle("settings-btn-upsell", !premium);
    if (premium) {
      settingsBtn?.classList.remove("attention");
      if (settingsAttentionTimer) {
        clearTimeout(settingsAttentionTimer);
        settingsAttentionTimer = null;
      }
    } else if (!hasPlayedSettingsAttention && settingsModal.classList.contains("hidden")) {
      hasPlayedSettingsAttention = true;
      settingsBtn?.classList.add("attention");
      settingsAttentionTimer = setTimeout(() => {
        settingsBtn?.classList.remove("attention");
        settingsAttentionTimer = null;
      }, 5800);
    }

    // Update theme preset buttons (main settings panel only)
    document.querySelectorAll(".theme-preset:not(.edit-theme-preset)").forEach(btn => {
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
    track(ANALYTICS_EVENTS.SETTINGS_OPENED);
    soundToggle.checked = soundEnabled;
    // Refresh premium status from storage
    premium = await isPremium();
    updatePremiumUI();
    updateBgImageUI();
    settingsBtn.classList.add("hidden");
    settingsBtn.setAttribute("aria-expanded", "true");
    settingsBtn.classList.remove("attention");
    settingsModal.classList.remove("hidden");
  });

  // Auto-save sound toggle
  soundToggle.addEventListener("change", async () => {
    soundEnabled = soundToggle.checked;
    await setSoundEnabled(soundEnabled);
    track(ANALYTICS_EVENTS.SOUND_TOGGLED, { enabled: soundEnabled });
  });

  clockFontSelect?.addEventListener("change", async () => {
    if (!premium) {
      syncFontUI();
      promptPremiumForFonts();
      return;
    }

    clockFontId = normalizeFontId(clockFontSelect.value);
    mainCountdown.clockFontId = clockFontId;
    await saveCountdowns(countdowns);
    syncFontUI();
    track(ANALYTICS_EVENTS.CLOCK_FONT_CHANGED, { font_id: clockFontId });
  });

  textFontSelect?.addEventListener("change", async () => {
    if (!premium) {
      syncFontUI();
      promptPremiumForFonts();
      return;
    }

    textFontId = normalizeFontId(textFontSelect.value);
    mainCountdown.textFontId = textFontId;
    await saveCountdowns(countdowns);
    syncFontUI();
    track(ANALYTICS_EVENTS.TEXT_FONT_CHANGED, { font_id: textFontId });
  });

  // Theme preset clicks (main settings panel only)
  document.querySelectorAll(".theme-preset:not(.edit-theme-preset)").forEach(btn => {
    btn.addEventListener("click", async () => {
      const presetId = btn.dataset.theme;
      const preset = THEME_PRESETS[presetId];

      if (preset?.premium && !premium) {
        licenseModal.classList.remove("hidden");
        licenseInput.focus();
        return;
      }

      if (presetId === 'custom' && !customTheme) {
        customTheme = {
          bg: '#1a1a1a',
          text: '#f5f5f3',
          muted: '#888888',
          border: '#333333',
          inputBg: '#2a2a2a'
        };
        mainCountdown.customColors = customTheme;
      }

      themeId = presetId;
      mainCountdown.themeId = themeId;
      await saveCountdowns(countdowns);
      applyTheme(themeId, customTheme);
      updatePremiumUI();
      track(ANALYTICS_EVENTS.THEME_CHANGED, { theme_id: themeId });
    });
  });

  // Color input change handlers
  async function handleColorChange() {
    customTheme = {
      bg: colorBg.value,
      text: colorText.value,
      muted: colorMuted.value,
      border: colorBorder.value,
      inputBg: colorBg.value
    };
    mainCountdown.customColors = customTheme;
    await saveCountdowns(countdowns);
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
  // Tracks which countdown id the crop is being applied to (null = main)
  let cropTargetId = null;

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
    cropTargetId = null;
  }

  function openCropForFile(file, targetId) {
    const reader = new FileReader();
    reader.onload = (event) => {
      cropTargetId = targetId;
      cropImage.src = event.target.result;
      cropModal.classList.remove("hidden");
      cropImage.onload = () => {
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImage, {
          aspectRatio: NaN,
          viewMode: 2,
          dragMode: 'crop',
          autoCropArea: 1,
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

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      bgImageInput.value = "";
      return;
    }

    openCropForFile(file, mainCountdown.id);
    bgImageInput.value = "";
  });

  // Crop apply button
  cropApplyBtn?.addEventListener("click", async () => {
    if (!cropper) return;

    const croppedCanvas = cropper.getCroppedCanvas();
    if (!croppedCanvas) {
      closeCropModal();
      return;
    }

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

    const imageData = finalCanvas.toDataURL("image/jpeg", 0.85);
    const targetId = cropTargetId || mainCountdown.id;
    await saveBgImage(targetId, imageData);
    bgImages = await getBgImages();

    if (targetId === mainCountdown.id) {
      bgImage = imageData;
      applyBackgroundImage(bgImage);
      updateBgImageUI();
    } else {
      // Update edit modal remove button for secondary countdown
      $("editBgImageRemove")?.classList.remove("hidden");
    }

    track(ANALYTICS_EVENTS.BACKGROUND_IMAGE_SET);
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
    await removeBgImage(mainCountdown.id);
    bgImages = await getBgImages();
    applyBackgroundImage(null);
    updateBgImageUI();
    track(ANALYTICS_EVENTS.BACKGROUND_IMAGE_REMOVED);
  });

  // ---------------------------------------------------------------------------
  // License Modal Event Handlers
  // ---------------------------------------------------------------------------

  // Upgrade button opens license modal
  $("upgradeBtn")?.addEventListener("click", () => {
    licenseModal.classList.remove("hidden");
    licenseInput.focus();
    track(ANALYTICS_EVENTS.UPGRADE_CLICKED);
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
      track(ANALYTICS_EVENTS.LICENSE_ACTIVATED);
    } else {
      licenseError.textContent = result.error || "Activation failed";
      licenseError.classList.remove("hidden");
      track(ANALYTICS_EVENTS.LICENSE_ACTIVATION_FAILED, { error: result.error || "Activation failed" });
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
      const cached = mainCountdown.shareLink;
      let shareUrl;

      if (cached && cached.targetIso === isoLocal) {
        shareUrl = cached.url;
        track(ANALYTICS_EVENTS.SHARE_LINK_COPIED);
      } else {
        const res = await fetch(`${WORKER_URL}/api/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: targetDate.toISOString(),
            title: mainCountdown.label || "Every Second Counts"
          })
        });

        const data = await res.json();

        if (res.status === 429) {
          const mins = data.retryAfterMinutes || 60;
          shareStatus.textContent = `Limit reached. Try in ${mins} min`;
          setTimeout(() => { shareStatus.textContent = ""; }, 3000);
          shareBtn.disabled = false;
          return;
        }

        if (data.url) {
          shareUrl = data.url;
          mainCountdown.shareLink = { url: shareUrl, targetIso: isoLocal };
          await saveCountdowns(countdowns);
          track(ANALYTICS_EVENTS.SHARE_LINK_CREATED);
        }
      }

      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        shareStatus.textContent = "Copied!";
        setTimeout(() => { shareStatus.textContent = ""; }, 1500);
      } else {
        shareStatus.textContent = "Failed";
        setTimeout(() => { shareStatus.textContent = ""; }, 2000);
      }
    } catch (e) {
      shareStatus.textContent = "Error";
      setTimeout(() => { shareStatus.textContent = ""; }, 2000);
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
      const addModal = $("addCountdownModal");
      if (addModal && !addModal.classList.contains("hidden")) {
        addModal.classList.add("hidden");
      }
      if (editingCountdownId) closeEditCountdownModal();
    }
  });

  // ===========================================================================
  // Multi-Countdown: Layout, Cards, and Actions
  // ===========================================================================

  function updateLayoutMode() {
    const isMulti = countdowns.length > 1;
    document.querySelector(".wrap")?.classList.toggle("wrap--multi", isMulti);
    $("cardsZone")?.classList.toggle("hidden", !isMulti);
    const mainLabel = $("mainCountdownLabel");
    if (mainLabel) {
      mainLabel.classList.toggle("hidden", !isMulti);
      if (isMulti) mainLabel.textContent = mainCountdown.label || "Main countdown";
    }
  }

  function formatCardTime(targetIsoLocal) {
    const dt = isoLocalToDate(targetIsoLocal);
    const diffMs = dt - Date.now();
    const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const formatted = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    return diffMs <= 0 ? `+${formatted}` : formatted;
  }

  function buildCountdownCard(c) {
    const card = document.createElement("div");
    card.className = "countdown-card";
    card.dataset.id = c.id;

    const dt = isoLocalToDate(c.targetIsoLocal);
    const label = c.label || "Countdown";

    card.innerHTML = `
      <div class="countdown-card-label">${label}</div>
      <div class="countdown-card-time">${formatCardTime(c.targetIsoLocal)}</div>
      <div class="countdown-card-target">${formatLocal(dt)}</div>
      <div class="countdown-card-actions">
        <button class="card-action-btn card-set-main-btn" data-id="${c.id}" aria-label="Set as main">Set as main</button>
        <button class="card-action-btn card-edit-btn" data-id="${c.id}" aria-label="Edit">Edit</button>
        <button class="card-action-btn card-share-btn" data-id="${c.id}" aria-label="Share">Share</button>
        <button class="card-action-btn danger card-delete-btn" data-id="${c.id}" aria-label="Delete">Delete</button>
      </div>
    `;
    return card;
  }

  function renderCardGrid() {
    const cardsZone = $("cardsZone");
    if (!cardsZone) return;
    cardsZone.innerHTML = "";
    countdowns.filter(c => !c.isMain).forEach(c => {
      cardsZone.appendChild(buildCountdownCard(c));
    });
    // Dashed "add" card at the end of the grid
    const addCard = document.createElement("button");
    addCard.id = "addCountdownBtn";
    addCard.className = "add-countdown-btn";
    addCard.setAttribute("aria-label", "Add countdown");
    addCard.textContent = "+ Add countdown";
    addCard.addEventListener("click", openAddCountdownModal);
    cardsZone.appendChild(addCard);
  }

  // Card ticker — updates time displays on secondary cards
  setInterval(() => {
    countdowns.forEach(c => {
      if (c.isMain) return;
      const el = document.querySelector(`.countdown-card[data-id="${c.id}"] .countdown-card-time`);
      if (el) el.textContent = formatCardTime(c.targetIsoLocal);
    });
  }, 250);

  // Delegate card action clicks
  $("cardsZone")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".card-action-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("card-set-main-btn")) {
      await handleSetAsMain(id);
    } else if (btn.classList.contains("card-edit-btn")) {
      openEditCountdownModal(id);
    } else if (btn.classList.contains("card-share-btn")) {
      await handleShareCard(btn, id);
    } else if (btn.classList.contains("card-delete-btn")) {
      await handleDeleteCountdown(id);
    }
  });

  async function handleSetAsMain(id) {
    setMainCountdown(countdowns, id);
    mainCountdown = getMainCountdown(countdowns);
    isoLocal = mainCountdown.targetIsoLocal;
    targetDate = isoLocalToDate(isoLocal);
    themeId = mainCountdown.themeId;
    clockFontId = mainCountdown.clockFontId || 'default';
    textFontId = mainCountdown.textFontId || 'default';
    customTheme = mainCountdown.customColors;
    bgImages = await getBgImages();
    bgImage = bgImages[mainCountdown.id] || null;

    applyTheme(themeId, customTheme);
    applyFontPreferences(clockFontId, textFontId, premium);
    applyBackgroundImage(bgImage);
    targetText.textContent = `Target: ${formatLocal(targetDate)}`;
    await saveCountdowns(countdowns);
    updateLayoutMode();
    renderCardGrid();
    track(ANALYTICS_EVENTS.COUNTDOWN_SET_MAIN);
  }

  async function handleDeleteCountdown(id) {
    if (!confirm("Delete this countdown?")) return;
    countdowns = countdowns.filter(c => c.id !== id);
    await saveCountdowns(countdowns);
    await removeBgImage(id);
    bgImages = await getBgImages();
    updateLayoutMode();
    renderCardGrid();
    track(ANALYTICS_EVENTS.COUNTDOWN_DELETED);
  }

  async function handleShareCard(btn, id) {
    const countdown = countdowns.find(c => c.id === id);
    if (!countdown) return;
    btn.disabled = true;
    const originalText = btn.textContent;

    try {
      const cached = countdown.shareLink;
      let shareUrl;
      const dt = isoLocalToDate(countdown.targetIsoLocal);

      if (cached && cached.targetIso === countdown.targetIsoLocal) {
        shareUrl = cached.url;
        track(ANALYTICS_EVENTS.SHARE_LINK_COPIED);
      } else {
        const res = await fetch(`${WORKER_URL}/api/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: dt.toISOString(),
            title: countdown.label || "Every Second Counts"
          })
        });
        const data = await res.json();

        if (res.status === 429) {
          btn.textContent = "Rate limit";
          setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 3000);
          return;
        }

        if (data.url) {
          shareUrl = data.url;
          countdown.shareLink = { url: shareUrl, targetIso: countdown.targetIsoLocal };
          await saveCountdowns(countdowns);
          track(ANALYTICS_EVENTS.COUNTDOWN_CARD_SHARED);
        }
      }

      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 1500);
        return;
      }
    } catch (e) {
      btn.textContent = "Error";
      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
      return;
    }

    btn.disabled = false;
  }

  // ===========================================================================
  // Add Countdown Modal
  // ===========================================================================

  function canAddCountdown() {
    return premium || countdowns.length < 5;
  }

  function openAddCountdownModal() {
    if (!canAddCountdown()) {
      licenseModal.classList.remove("hidden");
      licenseInput.focus();
      return;
    }
    const addDateInput = $("addDateInput");
    if (addDateInput) addDateInput.value = getTodayEOD();
    const addLabelInput = $("addLabelInput");
    if (addLabelInput) addLabelInput.value = "";
    $("addCountdownError")?.classList.add("hidden");
    $("addCountdownModal")?.classList.remove("hidden");
  }

  $("addCountdownFloatBtn")?.addEventListener("click", openAddCountdownModal);
  $("addCountdownBtn")?.addEventListener("click", openAddCountdownModal);

  $("addCountdownCancelBtn")?.addEventListener("click", () => {
    $("addCountdownModal")?.classList.add("hidden");
  });

  $("addCountdownSaveBtn")?.addEventListener("click", async () => {
    const label = $("addLabelInput")?.value.trim() || "";
    const dateVal = $("addDateInput")?.value?.trim();
    const errEl = $("addCountdownError");

    if (!dateVal) {
      if (errEl) { errEl.textContent = "Please select a target date"; errEl.classList.remove("hidden"); }
      return;
    }

    if (!canAddCountdown()) {
      licenseModal.classList.remove("hidden");
      licenseInput.focus();
      return;
    }

    const newCountdown = createDefaultCountdown(label, dateVal, false);
    countdowns.push(newCountdown);
    await saveCountdowns(countdowns);
    $("addCountdownModal")?.classList.add("hidden");
    updateLayoutMode();
    renderCardGrid();
    track(ANALYTICS_EVENTS.COUNTDOWN_ADDED);
  });

  // ===========================================================================
  // Edit Countdown Modal
  // ===========================================================================

  let editingCountdownId = null;

  function populateEditModal(c) {
    $("editCountdownId").value = c.id;
    $("editLabelInput").value = c.label || "";
    $("editDateInput").value = c.targetIsoLocal;

    // Theme presets
    document.querySelectorAll(".edit-theme-preset").forEach(btn => {
      const presetId = btn.dataset.theme;
      const preset = THEME_PRESETS[presetId];
      const isLocked = preset?.premium && !premium;
      btn.classList.toggle("locked", isLocked);
      btn.classList.toggle("active", presetId === c.themeId);
      const lockIcon = btn.querySelector(".edit-theme-lock");
      if (lockIcon) lockIcon.style.display = isLocked ? "inline" : "none";
    });

    // Fonts
    const editFontSection = $("editFontSection");
    const editFontLock = $("editFontLock");
    const editClockFontSelect = $("editClockFontSelect");
    const editTextFontSelect = $("editTextFontSelect");
    if (editFontSection) editFontSection.classList.toggle("locked", !premium);
    if (editFontLock) editFontLock.style.display = premium ? "none" : "inline";
    if (editClockFontSelect) {
      editClockFontSelect.disabled = !premium;
      editClockFontSelect.value = resolveFontId(c.clockFontId || "default", premium);
    }
    if (editTextFontSelect) {
      editTextFontSelect.disabled = !premium;
      editTextFontSelect.value = resolveFontId(c.textFontId || "default", premium);
    }

    // Bg image UI
    const hasBg = !!(bgImages[c.id]);
    const editBgImageLabel = $("editBgImageLabel");
    const editBgImageLock = $("editBgImageLock");
    $("editBgImageRemove")?.classList.toggle("hidden", !hasBg);
    if (editBgImageLabel) editBgImageLabel.classList.toggle("locked", !premium);
    if (editBgImageLock) editBgImageLock.style.display = premium ? "none" : "inline";
  }

  function openEditCountdownModal(id) {
    const c = countdowns.find(cd => cd.id === id);
    if (!c) return;
    editingCountdownId = id;
    $("editCountdownError")?.classList.add("hidden");
    populateEditModal(c);
    $("editCountdownModal")?.classList.remove("hidden");
  }

  function closeEditCountdownModal() {
    $("editCountdownModal")?.classList.add("hidden");
    editingCountdownId = null;
  }

  $("editCountdownCancelBtn")?.addEventListener("click", closeEditCountdownModal);

  // Edit modal theme preset clicks
  document.querySelectorAll(".edit-theme-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!editingCountdownId) return;
      const presetId = btn.dataset.theme;
      const preset = THEME_PRESETS[presetId];
      if (preset?.premium && !premium) {
        closeEditCountdownModal();
        licenseModal.classList.remove("hidden");
        licenseInput.focus();
        return;
      }
      const c = countdowns.find(cd => cd.id === editingCountdownId);
      if (c) c.themeId = presetId;
      document.querySelectorAll(".edit-theme-preset").forEach(b => {
        b.classList.toggle("active", b.dataset.theme === presetId);
      });
    });
  });

  // Edit bg image upload
  $("editBgImageInput")?.addEventListener("change", async (e) => {
    if (!premium) {
      licenseModal.classList.remove("hidden");
      licenseInput.focus();
      $("editBgImageInput").value = "";
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      $("editBgImageInput").value = "";
      return;
    }
    openCropForFile(file, editingCountdownId);
    $("editBgImageInput").value = "";
  });

  // Edit bg image remove
  $("editBgImageRemove")?.addEventListener("click", async () => {
    if (!editingCountdownId) return;
    await removeBgImage(editingCountdownId);
    bgImages = await getBgImages();
    $("editBgImageRemove")?.classList.add("hidden");
    track(ANALYTICS_EVENTS.BACKGROUND_IMAGE_REMOVED);
  });

  // Save edit
  $("editCountdownSaveBtn")?.addEventListener("click", async () => {
    if (!editingCountdownId) return;
    const c = countdowns.find(cd => cd.id === editingCountdownId);
    if (!c) return;

    const dateVal = $("editDateInput")?.value?.trim();
    const errEl = $("editCountdownError");
    if (!dateVal) {
      if (errEl) { errEl.textContent = "Please select a target date"; errEl.classList.remove("hidden"); }
      return;
    }

    c.label = $("editLabelInput")?.value.trim() || "";
    c.targetIsoLocal = dateVal;
    if (premium) {
      c.clockFontId = normalizeFontId($("editClockFontSelect")?.value || "default");
      c.textFontId = normalizeFontId($("editTextFontSelect")?.value || "default");
    }

    await saveCountdowns(countdowns);
    renderCardGrid();
    closeEditCountdownModal();
  });

  // ===========================================================================
  // Initialize multi-countdown layout
  // ===========================================================================

  updateLayoutMode();
  renderCardGrid();
}

// Start the app
init();
