const $ = (id) => document.getElementById(id);

const hh = $("hh");
const mm = $("mm");
const ss = $("ss");
const targetText = $("targetText");
const statusText = $("statusText");

const modal = $("modal");
const dtInput = $("dtInput");
const soundToggle = $("soundToggle");
const saveBtn = $("saveBtn");
const cancelBtn = $("cancelBtn");

// Default target (if user never sets one).
// IMPORTANT: This is interpreted as LOCAL time.
const DEFAULT_TARGET_ISO_LOCAL = "2026-01-31T23:59";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatLocal(dt) {
  // Nice readable local format
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

  // Play two beeps
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
  // isoLocal like "2026-01-31T23:59"
  // new Date("...") treats this as local in modern browsers for datetime-local style strings.
  // To be safe, parse manually:
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

  hh.textContent = pad2(hours);   // hours can exceed 99; still shows properly
  mm.textContent = pad2(minutes);
  ss.textContent = pad2(seconds);
}

function openModal(currentIsoLocal) {
  dtInput.value = currentIsoLocal;
  modal.classList.remove("hidden");
  dtInput.focus();
}

function closeModal() {
  modal.classList.add("hidden");
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
      // Update local var after sound plays
      if (soundPlayedFor !== isoLocal) {
        getSoundPlayedFor().then(val => soundPlayedFor = val);
      }
    });
  };
  tick();
  setInterval(tick, 250);

  // Settings - click target text to open modal
  targetText.addEventListener("click", () => {
    openModal(isoLocal);
    soundToggle.checked = soundEnabled;
  });
  cancelBtn.addEventListener("click", closeModal);

  saveBtn.addEventListener("click", async () => {
    const val = dtInput.value?.trim();
    if (!val) return;

    isoLocal = val;
    soundEnabled = soundToggle.checked;

    await setTargetIsoLocal(isoLocal);
    await setSoundEnabled(soundEnabled);

    targetDate = isoLocalToDate(isoLocal);
    targetText.textContent = `Target: ${formatLocal(targetDate)}`;

    closeModal();
  });

  // Close modal on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Escape to close
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });
}

init();
