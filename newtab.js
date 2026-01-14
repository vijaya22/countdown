/**
 * Every Second Counts - New Tab Countdown Extension
 *
 * This extension replaces the new tab page with a countdown timer.
 * Features:
 * - Set target date/time for countdown
 * - Sound alert when countdown ends
 * - Shareable countdown links via Cloudflare Worker
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

// Date modal elements
const dateModal = $("dateModal");
const dtInput = $("dtInput");

// Settings modal elements
const settingsModal = $("settingsModal");
const settingsBtn = $("settingsBtn");
const soundToggle = $("soundToggle");
const shareBtn = $("shareBtn");
const shareStatus = $("shareStatus");

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

// =============================================================================
// Chrome Storage Functions
// =============================================================================

/**
 * Gets the target date from storage
 * @returns {Promise<string>} ISO local string of target date
 */
async function getTargetIsoLocal() {
  const { targetIsoLocal = DEFAULT_TARGET_ISO_LOCAL } =
    await chrome.storage.sync.get({ targetIsoLocal: DEFAULT_TARGET_ISO_LOCAL });
  return targetIsoLocal;
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

  // Countdown finished
  if (diffMs <= 0) {
    hh.textContent = "00";
    mm.textContent = "00";
    ss.textContent = "00";
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

  // Display target date
  targetText.textContent = `Target: ${formatLocal(targetDate)}`;

  // Start countdown ticker (updates every 250ms for smooth display)
  const tick = () => {
    updateCountdown(targetDate, soundEnabled, isoLocal, soundPlayedFor).then(() => {
      if (soundPlayedFor !== isoLocal) {
        getSoundPlayedFor().then(val => soundPlayedFor = val);
      }
    });
  };
  tick();
  setInterval(tick, 250);

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

  // Open settings modal
  settingsBtn.addEventListener("click", () => {
    soundToggle.checked = soundEnabled;
    settingsModal.classList.remove("hidden");
  });

  // Auto-save sound toggle
  soundToggle.addEventListener("change", async () => {
    soundEnabled = soundToggle.checked;
    await setSoundEnabled(soundEnabled);
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
    }
  });
}

// Start the app
init();
