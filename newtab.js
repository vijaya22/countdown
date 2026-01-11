const $ = (id) => document.getElementById(id);

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

// Default target (if user never sets one).
const DEFAULT_TARGET_ISO_LOCAL = "2026-01-31T23:59";

function pad2(n) {
  return String(n).padStart(2, "0");
}

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

async function getTargetIsoLocal() {
  const { targetIsoLocal = DEFAULT_TARGET_ISO_LOCAL } =
    await chrome.storage.sync.get({ targetIsoLocal: DEFAULT_TARGET_ISO_LOCAL });
  return targetIsoLocal;
}

async function setTargetIsoLocal(val) {
  await chrome.storage.sync.set({ targetIsoLocal: val });
}

async function getSoundEnabled() {
  const { soundEnabled = true } = await chrome.storage.sync.get({ soundEnabled: true });
  return soundEnabled;
}

async function setSoundEnabled(val) {
  await chrome.storage.sync.set({ soundEnabled: val });
}

async function getSoundPlayedFor() {
  const { soundPlayedFor = null } = await chrome.storage.sync.get({ soundPlayedFor: null });
  return soundPlayedFor;
}

async function setSoundPlayedFor(targetIso) {
  await chrome.storage.sync.set({ soundPlayedFor: targetIso });
}

function playAlertSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  [0, 0.2].forEach((delay) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 880;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);

    oscillator.start(audioCtx.currentTime + delay);
    oscillator.stop(audioCtx.currentTime + delay + 0.15);
  });
}

function isoLocalToDate(isoLocal) {
  const [datePart, timePart] = isoLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

async function updateCountdown(targetDate, soundEnabled, isoLocal, soundPlayedFor) {
  const now = new Date();
  const diffMs = targetDate - now;

  if (diffMs <= 0) {
    hh.textContent = "00";
    mm.textContent = "00";
    ss.textContent = "00";
    statusText.textContent = "✅ Time's up!";

    if (soundEnabled && soundPlayedFor !== isoLocal) {
      playAlertSound();
      await setSoundPlayedFor(isoLocal);
    }
    return;
  }

  statusText.textContent = "";

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  hh.textContent = pad2(hours);
  mm.textContent = pad2(minutes);
  ss.textContent = pad2(seconds);
}

function closeDateModal() {
  dateModal.classList.add("hidden");
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
}

async function init() {
  let isoLocal = await getTargetIsoLocal();
  let targetDate = isoLocalToDate(isoLocal);
  let soundEnabled = await getSoundEnabled();
  let soundPlayedFor = await getSoundPlayedFor();

  targetText.textContent = `Target: ${formatLocal(targetDate)}`;

  // Tick
  const tick = () => {
    updateCountdown(targetDate, soundEnabled, isoLocal, soundPlayedFor).then(() => {
      if (soundPlayedFor !== isoLocal) {
        getSoundPlayedFor().then(val => soundPlayedFor = val);
      }
    });
  };
  tick();
  setInterval(tick, 250);

  // Date modal - click target text to open
  targetText.addEventListener("click", () => {
    dtInput.value = isoLocal;
    dateModal.classList.remove("hidden");
    dtInput.focus();
  });

  // Auto-save date on change
  dtInput.addEventListener("change", async () => {
    const val = dtInput.value?.trim();
    if (!val) return;

    isoLocal = val;
    await setTargetIsoLocal(isoLocal);

    targetDate = isoLocalToDate(isoLocal);
    targetText.textContent = `Target: ${formatLocal(targetDate)}`;

    closeDateModal();
  });

  dateModal.addEventListener("click", (e) => {
    if (e.target === dateModal) closeDateModal();
  });

  // Settings modal - click gear icon to open
  settingsBtn.addEventListener("click", () => {
    soundToggle.checked = soundEnabled;
    settingsModal.classList.remove("hidden");
  });

  // Auto-save sound toggle on change
  soundToggle.addEventListener("change", async () => {
    soundEnabled = soundToggle.checked;
    await setSoundEnabled(soundEnabled);
  });

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  // Escape to close any open modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!dateModal.classList.contains("hidden")) closeDateModal();
      if (!settingsModal.classList.contains("hidden")) closeSettingsModal();
    }
  });
}

init();
