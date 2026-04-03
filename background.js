importScripts("constants.js");
importScripts("analytics.js");

const POMODORO_STORAGE_KEY = "pomodoroState";
const POMODORO_SETTINGS_KEY = "pomodoroSettings";
const POMODORO_ALARM_NAME = "pomodoro-phase-end";
const WORLD_STORAGE_KEY = "worldState";

const PHASE_LABELS = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break"
};

const DEFAULT_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  runIntervals: 4,
  pomodoroSoundEnabled: true
};

const GARDEN_RESIDENT_POOL = [
  { kind: "cat", label: "Cat" },
  { kind: "flower", label: "Flower" },
  { kind: "bee", label: "Bee" },
  { kind: "bunny", label: "Bunny" },
  { kind: "tulip", label: "Tulip" },
  { kind: "mushroom", label: "Mushroom" }
];

const WORLD_RESIDENT_KIND_MAP = {
  dog: { kind: "cat", label: "Cat" },
  bird: { kind: "cat", label: "Cat" }
};

const DEFAULT_WORLD_STATE = {
  panelExpanded: true,
  activeCountdownId: null,
  countdownActivatedAt: null,
  countdownTargetAt: null,
  countdownCompletionRewarded: false,
  spawnedResidents: [],
  recentResidentId: null
};

function storageLocalGet(defaults) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(defaults, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result || {});
    });
  });
}

function storageLocalSet(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function alarmsClear(name) {
  return new Promise((resolve) => {
    chrome.alarms.clear(name, () => resolve());
  });
}

function notificationsCreate(options) {
  return new Promise((resolve) => {
    chrome.notifications.create(options, () => resolve());
  });
}

function clampInt(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampNonNegativeInt(val, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function normalizeTimestamp(val) {
  return typeof val === "number" && Number.isFinite(val) && val > 0 ? Math.floor(val) : null;
}

function normalizeResident(raw, fallbackIndex = 0) {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallback = GARDEN_RESIDENT_POOL[fallbackIndex % GARDEN_RESIDENT_POOL.length];
  const sourceKind =
    typeof source.kind === "string" && source.kind.trim()
      ? source.kind.trim()
      : fallback.kind;
  const mappedKind = WORLD_RESIDENT_KIND_MAP[sourceKind] || null;
  const normalizedKind = mappedKind?.kind || sourceKind;
  const poolEntry = GARDEN_RESIDENT_POOL.find((entry) => entry.kind === normalizedKind) || fallback;

  return {
    id:
      typeof source.id === "string" && source.id.trim()
        ? source.id
        : `resident-${poolEntry.kind}-${fallbackIndex}`,
    kind: poolEntry.kind,
    label:
      typeof source.label === "string" && source.label.trim()
        ? (mappedKind?.label || source.label)
        : poolEntry.label,
    sourceCountdownId:
      typeof source.sourceCountdownId === "string" && source.sourceCountdownId.trim()
        ? source.sourceCountdownId
        : null,
    spawnedAt: normalizeTimestamp(source.spawnedAt)
  };
}

function normalizeResidents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((resident, index) => normalizeResident(resident, index));
}

function getNextResidentTemplate(state) {
  const residents = normalizeResidents(state?.spawnedResidents);
  return GARDEN_RESIDENT_POOL[residents.length % GARDEN_RESIDENT_POOL.length];
}

function normalizeWorldState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const spawnedResidents = normalizeResidents(source.spawnedResidents);
  const nextResident = getNextResidentTemplate({ spawnedResidents });

  return {
    ...DEFAULT_WORLD_STATE,
    panelExpanded: source.panelExpanded !== false,
    activeCountdownId: typeof source.activeCountdownId === "string" ? source.activeCountdownId : null,
    countdownActivatedAt: normalizeTimestamp(source.countdownActivatedAt),
    countdownTargetAt: normalizeTimestamp(source.countdownTargetAt),
    countdownCompletionRewarded: Boolean(source.countdownCompletionRewarded),
    spawnedResidents,
    recentResidentId:
      typeof source.recentResidentId === "string" && source.recentResidentId.trim()
        ? source.recentResidentId
        : null,
    residentCount: spawnedResidents.length,
    nextResidentKind: nextResident.kind,
    nextResidentLabel: nextResident.label
  };
}

function buildWorldResponse(state) {
  const normalized = normalizeWorldState(state);
  return {
    ok: true,
    state: {
      panelExpanded: normalized.panelExpanded,
      activeCountdownId: normalized.activeCountdownId,
      countdownActivatedAt: normalized.countdownActivatedAt,
      countdownTargetAt: normalized.countdownTargetAt,
      countdownCompletionRewarded: normalized.countdownCompletionRewarded,
      residentCount: normalized.residentCount,
      nextResidentKind: normalized.nextResidentKind,
      nextResidentLabel: normalized.nextResidentLabel,
      recentResidentId: normalized.recentResidentId,
      spawnedResidents: normalized.spawnedResidents
    }
  };
}

async function getWorldState() {
  const { [WORLD_STORAGE_KEY]: stored = null } = await storageLocalGet({
    [WORLD_STORAGE_KEY]: null
  });
  return normalizeWorldState(stored);
}

async function saveWorldState(state) {
  await storageLocalSet({ [WORLD_STORAGE_KEY]: normalizeWorldState(state) });
}

function worldStateEquals(a, b) {
  const left = normalizeWorldState(a);
  const right = normalizeWorldState(b);
  return JSON.stringify(left) === JSON.stringify(right);
}

function spawnResident(state, now = Date.now()) {
  const world = normalizeWorldState(state);
  const template = getNextResidentTemplate(world);
  const residentId = `${template.kind}-${now}`;

  return normalizeWorldState({
    ...world,
    countdownCompletionRewarded: true,
    recentResidentId: residentId,
    spawnedResidents: [
      ...world.spawnedResidents,
      {
        id: residentId,
        kind: template.kind,
        label: template.label,
        sourceCountdownId: world.activeCountdownId,
        spawnedAt: now
      }
    ]
  });
}

function syncWorldCountdownCompletion(state, now = Date.now()) {
  const world = normalizeWorldState(state);
  if (!world.activeCountdownId || !world.countdownTargetAt) {
    return normalizeWorldState({
      ...world,
      activeCountdownId: world.activeCountdownId,
      countdownActivatedAt: world.activeCountdownId ? world.countdownActivatedAt : null,
      countdownTargetAt: world.activeCountdownId ? world.countdownTargetAt : null,
      countdownCompletionRewarded: world.activeCountdownId ? world.countdownCompletionRewarded : false
    });
  }

  if (now < world.countdownTargetAt || world.countdownCompletionRewarded) {
    return world;
  }

  return spawnResident(world, now);
}

async function reconcileWorldState(options = {}) {
  const now = options.now || Date.now();
  const current = await getWorldState();
  const next = syncWorldCountdownCompletion(current, now);

  if (!worldStateEquals(current, next)) {
    await saveWorldState(next);
    return next;
  }

  return next;
}

async function awardWorldForCompletedFocusPhase() {
  return null;
}

function normalizePomodoroSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    focusMinutes: clampInt(source.focusMinutes, 1, 180, DEFAULT_SETTINGS.focusMinutes),
    shortBreakMinutes: clampInt(source.shortBreakMinutes, 1, 60, DEFAULT_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampInt(source.longBreakMinutes, 1, 120, DEFAULT_SETTINGS.longBreakMinutes),
    longBreakEvery: clampInt(source.longBreakEvery, 2, 12, DEFAULT_SETTINGS.longBreakEvery),
    runIntervals: clampInt(source.runIntervals, 1, 30, DEFAULT_SETTINGS.runIntervals),
    pomodoroSoundEnabled:
      typeof source.pomodoroSoundEnabled === "boolean"
        ? source.pomodoroSoundEnabled
        : DEFAULT_SETTINGS.pomodoroSoundEnabled
  };
}

function getPhaseDurationMs(phase, settings) {
  if (phase === "shortBreak") return settings.shortBreakMinutes * 60 * 1000;
  if (phase === "longBreak") return settings.longBreakMinutes * 60 * 1000;
  return settings.focusMinutes * 60 * 1000;
}

function getInitialPomodoroState(settings) {
  return {
    phase: "focus",
    isRunning: false,
    status: "stopped",
    stopReason: "initial",
    remainingMs: getPhaseDurationMs("focus", settings),
    endTimeMs: null,
    completedFocusSessions: 0,
    lastTransitionAt: 0
  };
}

function normalizePomodoroState(raw, settings) {
  if (!raw || typeof raw !== "object") {
    return getInitialPomodoroState(settings);
  }

  const phase = PHASE_LABELS[raw.phase] ? raw.phase : "focus";
  const fallbackDuration = getPhaseDurationMs(phase, settings);
  const remainingMs =
    typeof raw.remainingMs === "number" && raw.remainingMs > 0
      ? raw.remainingMs
      : fallbackDuration;

  const isRunning = Boolean(raw.isRunning);
  const status =
    raw.status === "stopped" || raw.status === "paused" || raw.status === "running"
      ? raw.status
      : isRunning
      ? "running"
      : "paused";
  const stopReason =
    raw.stopReason === "completed" || raw.stopReason === "initial" || raw.stopReason === "manual"
      ? raw.stopReason
      : "manual";
  const completedFocusSessionsRaw = Number.isInteger(raw.completedFocusSessions)
    ? Math.max(0, raw.completedFocusSessions)
    : 0;
  const completedFocusSessions = Math.min(completedFocusSessionsRaw, settings.runIntervals);

  return {
    phase,
    isRunning,
    status,
    stopReason,
    remainingMs,
    endTimeMs: typeof raw.endTimeMs === "number" ? raw.endTimeMs : null,
    completedFocusSessions,
    lastTransitionAt: typeof raw.lastTransitionAt === "number" ? raw.lastTransitionAt : 0
  };
}

async function getPomodoroSettings() {
  const { [POMODORO_SETTINGS_KEY]: stored = null } = await storageLocalGet({
    [POMODORO_SETTINGS_KEY]: null
  });
  return normalizePomodoroSettings(stored);
}

async function savePomodoroSettings(settings) {
  await storageLocalSet({ [POMODORO_SETTINGS_KEY]: settings });
}

async function getPomodoroState(settings) {
  const { [POMODORO_STORAGE_KEY]: stored = null } = await storageLocalGet({
    [POMODORO_STORAGE_KEY]: null
  });
  return normalizePomodoroState(stored, settings);
}

async function savePomodoroState(state) {
  await storageLocalSet({ [POMODORO_STORAGE_KEY]: state });
}

function getRemainingMs(state, now = Date.now()) {
  if (state.isRunning && state.endTimeMs) {
    return Math.max(0, state.endTimeMs - now);
  }
  return Math.max(0, state.remainingMs);
}

async function schedulePomodoroAlarm(state) {
  await alarmsClear(POMODORO_ALARM_NAME);
  if (state.isRunning && state.endTimeMs) {
    chrome.alarms.create(POMODORO_ALARM_NAME, { when: state.endTimeMs });
  }
}

function getNextPhase(state, settings) {
  if (state.phase === "focus") {
    const completedFocusSessions = state.completedFocusSessions + 1;
    const nextPhase =
      completedFocusSessions % settings.longBreakEvery === 0 ? "longBreak" : "shortBreak";

    return { nextPhase, completedFocusSessions };
  }

  return { nextPhase: "focus", completedFocusSessions: state.completedFocusSessions };
}

function buildTransitionMessage(fromPhase, toPhase) {
  if (fromPhase === "focus") {
    return toPhase === "longBreak"
      ? "Focus session complete. Time for a long break."
      : "Focus session complete. Time for a short break.";
  }
  return "Break complete. Back to focus.";
}

async function notifyPhaseTransition(fromPhase, toPhase) {
  await notificationsCreate({
    type: "basic",
    iconUrl: "assets/icon128.png",
    title: `Pomodoro: ${PHASE_LABELS[toPhase]}`,
    message: buildTransitionMessage(fromPhase, toPhase),
    priority: 0
  });
}

async function notifyRunCompleted() {
  await notificationsCreate({
    type: "basic",
    iconUrl: "assets/icon128.png",
    title: "Pomodoro complete",
    message: "All configured focus intervals are done.",
    priority: 0
  });
}

function buildStoppedState(settings, stopReason, now, completedFocusSessions = 0) {
  return {
    ...getInitialPomodoroState(settings),
    stopReason,
    completedFocusSessions,
    lastTransitionAt: now
  };
}

async function transitionToNextPhase(state, settings, now = Date.now(), shouldNotify = true) {
  const fromPhase = state.phase;
  const { nextPhase, completedFocusSessions } = getNextPhase(state, settings);

  if (fromPhase === "focus") {
    await awardWorldForCompletedFocusPhase(state, now);
  }

  if (fromPhase === "focus" && completedFocusSessions >= settings.runIntervals) {
    const stoppedState = buildStoppedState(settings, "completed", now, completedFocusSessions);
    await savePomodoroState(stoppedState);
    await schedulePomodoroAlarm(stoppedState);
    if (shouldNotify) {
      await notifyRunCompleted();
    }
    track(ANALYTICS_EVENTS.POMODORO_RUN_COMPLETED, { sessions_completed: completedFocusSessions });
    return stoppedState;
  }

  const nextDuration = getPhaseDurationMs(nextPhase, settings);

  const nextState = {
    ...state,
    phase: nextPhase,
    isRunning: true,
    status: "running",
    stopReason: "manual",
    remainingMs: nextDuration,
    endTimeMs: now + nextDuration,
    completedFocusSessions,
    lastTransitionAt: now
  };

  await savePomodoroState(nextState);
  await schedulePomodoroAlarm(nextState);
  await reconcileWorldState({ now, pomodoroState: nextState });
  if (shouldNotify) {
    await notifyPhaseTransition(fromPhase, nextPhase);
  }
  track(ANALYTICS_EVENTS.POMODORO_PHASE_COMPLETED, { from_phase: fromPhase, to_phase: nextPhase });
  return nextState;
}

function withComputedRemaining(state) {
  return {
    ...state,
    remainingMs: getRemainingMs(state)
  };
}

function buildResponse(state, settings) {
  return {
    ok: true,
    state: withComputedRemaining(state),
    settings
  };
}

async function ensurePomodoroScheduled() {
  const settings = await getPomodoroSettings();
  const state = await getPomodoroState(settings);
  const now = Date.now();

  await reconcileWorldState({ now, pomodoroState: state });

  if (!state.isRunning) {
    await schedulePomodoroAlarm(state);
    await savePomodoroState({
      ...state,
      endTimeMs: null
    });
    return;
  }

  if (state.endTimeMs && state.endTimeMs <= now) {
    await transitionToNextPhase(state, settings, now, true);
    return;
  }

  if (!state.endTimeMs) {
    const repairedRemaining = getRemainingMs(state, now);
    const repaired = {
      ...state,
      remainingMs: repairedRemaining,
      endTimeMs: now + repairedRemaining,
      status: "running"
    };
    await savePomodoroState(repaired);
    await schedulePomodoroAlarm(repaired);
    return;
  }

  await schedulePomodoroAlarm(state);
}

async function handlePomodoroMessage(message) {
  const now = Date.now();
  const settings = await getPomodoroSettings();
  const state = await getPomodoroState(settings);

  await reconcileWorldState({ now, pomodoroState: state });

  if (message?.type === "pomodoro:getState") {
    if (state.isRunning && state.endTimeMs && state.endTimeMs <= now) {
      const nextState = await transitionToNextPhase(state, settings, now, true);
      await reconcileWorldState({ now, pomodoroState: nextState });
      return buildResponse(nextState, settings);
    }
    return buildResponse(state, settings);
  }

  if (message?.type === "pomodoro:toggle") {
    if (state.isRunning) {
      const paused = {
        ...state,
        isRunning: false,
        status: "paused",
        stopReason: "manual",
        remainingMs: getRemainingMs(state, now),
        endTimeMs: null
      };
      await savePomodoroState(paused);
      await schedulePomodoroAlarm(paused);
      await reconcileWorldState({ now, pomodoroState: paused });
      return buildResponse(paused, settings);
    }

    const baseState =
      state.status === "stopped"
        ? {
            ...getInitialPomodoroState(settings),
            stopReason: "manual",
            lastTransitionAt: state.lastTransitionAt || 0
          }
        : state;
    const fallbackPhaseDuration = getPhaseDurationMs(baseState.phase, settings);
    const remaining = Math.max(1000, getRemainingMs(baseState, now) || fallbackPhaseDuration);
    const running = {
      ...baseState,
      isRunning: true,
      status: "running",
      stopReason: "manual",
      remainingMs: remaining,
      endTimeMs: now + remaining
    };
    await savePomodoroState(running);
    await schedulePomodoroAlarm(running);
    await reconcileWorldState({ now, pomodoroState: running });
    return buildResponse(running, settings);
  }

  if (message?.type === "pomodoro:skip") {
    const { nextPhase, completedFocusSessions } = getNextPhase(state, settings);

    if (state.phase === "focus" && completedFocusSessions >= settings.runIntervals) {
      const stoppedState = buildStoppedState(settings, "completed", now, completedFocusSessions);
      await savePomodoroState(stoppedState);
      await schedulePomodoroAlarm(stoppedState);
      await reconcileWorldState({ now, pomodoroState: stoppedState });
      return buildResponse(stoppedState, settings);
    }

    const nextDuration = getPhaseDurationMs(nextPhase, settings);
    const skipped = {
      ...state,
      phase: nextPhase,
      completedFocusSessions,
      remainingMs: nextDuration,
      status: state.isRunning ? "running" : state.status,
      stopReason: "manual",
      endTimeMs: state.isRunning ? now + nextDuration : null,
      lastTransitionAt: now
    };
    await savePomodoroState(skipped);
    await schedulePomodoroAlarm(skipped);
    await reconcileWorldState({ now, pomodoroState: skipped });
    return buildResponse(skipped, settings);
  }

  if (message?.type === "pomodoro:reset") {
    const resetState = {
      ...getInitialPomodoroState(settings),
      status: "paused",
      stopReason: "manual"
    };
    await savePomodoroState(resetState);
    await schedulePomodoroAlarm(resetState);
    await reconcileWorldState({ now, pomodoroState: resetState });
    return buildResponse(resetState, settings);
  }

  if (message?.type === "pomodoro:stop") {
    const stopped = buildStoppedState(settings, "manual", now, 0);
    await savePomodoroState(stopped);
    await schedulePomodoroAlarm(stopped);
    await reconcileWorldState({ now, pomodoroState: stopped });
    return buildResponse(stopped, settings);
  }

  if (message?.type === "pomodoro:updateSettings") {
    const nextSettings = normalizePomodoroSettings(message.settings);
    await savePomodoroSettings(nextSettings);

    const existing = await getPomodoroState(nextSettings);
    let nextState;
    if (existing.isRunning) {
      const remaining = getRemainingMs(existing, now);
      nextState = {
        ...existing,
        status: "running",
        stopReason: "manual",
        remainingMs: remaining,
        endTimeMs: now + remaining
      };
    } else {
      const completedFocusSessions = Math.min(existing.completedFocusSessions, nextSettings.runIntervals);
      const stopReason = completedFocusSessions >= nextSettings.runIntervals ? "completed" : existing.stopReason;
      nextState = {
        ...existing,
        stopReason,
        completedFocusSessions,
        remainingMs: getPhaseDurationMs(existing.phase, nextSettings),
        endTimeMs: null
      };
    }

    await savePomodoroState(nextState);
    await schedulePomodoroAlarm(nextState);
    await reconcileWorldState({ now, pomodoroState: nextState });
    return buildResponse(nextState, nextSettings);
  }

  return null;
}

async function handleWorldMessage(message) {
  const now = Date.now();

  if (message?.type === "world:getState") {
    const world = await reconcileWorldState({ now });
    return buildWorldResponse(world);
  }

  if (message?.type === "world:setPanelExpanded") {
    const current = await reconcileWorldState({ now });
    const next = normalizeWorldState({
      ...current,
      panelExpanded: message.expanded !== false
    });
    if (!worldStateEquals(current, next)) {
      await saveWorldState(next);
    }
    return buildWorldResponse(next);
  }

  if (message?.type === "world:setActiveCountdown") {
    const current = await reconcileWorldState({ now });
    const countdownId = typeof message.countdownId === "string" ? message.countdownId : null;
    const countdownTargetAt = normalizeTimestamp(message.targetTimeMs);

    if (
      current.activeCountdownId === countdownId &&
      current.countdownTargetAt === countdownTargetAt
    ) {
      return buildWorldResponse(current);
    }

    const next = normalizeWorldState({
      ...current,
      activeCountdownId: countdownId,
      countdownActivatedAt: countdownId && countdownTargetAt ? now : null,
      countdownTargetAt: countdownId && countdownTargetAt ? countdownTargetAt : null,
      countdownCompletionRewarded: false,
      recentResidentId: current.recentResidentId
    });

    await saveWorldState(next);
    return buildWorldResponse(next);
  }

  if (message?.type === "world:debugSpawnResident") {
    const current = await reconcileWorldState({ now });
    const next = spawnResident(
      normalizeWorldState({
        ...current,
        activeCountdownId: current.activeCountdownId || "debug-countdown",
        countdownCompletionRewarded: false
      }),
      now
    );
    await saveWorldState(next);
    return buildWorldResponse(next);
  }

  if (message?.type === "world:ackRecentResident") {
    const current = await reconcileWorldState({ now });
    if (!current.recentResidentId || current.recentResidentId !== message.residentId) {
      return buildWorldResponse(current);
    }
    const next = normalizeWorldState({
      ...current,
      recentResidentId: null
    });
    await saveWorldState(next);
    return buildWorldResponse(next);
  }

  return null;
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    track(ANALYTICS_EVENTS.EXTENSION_INSTALLED);
  } else if (details.reason === "update") {
    track(ANALYTICS_EVENTS.EXTENSION_UPDATED, { previous_version: details.previousVersion });
  }
  void ensurePomodoroScheduled();
  void reconcileWorldState();
});

chrome.runtime.onStartup.addListener(() => {
  void ensurePomodoroScheduled();
  void reconcileWorldState();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== POMODORO_ALARM_NAME) return;

  void (async () => {
    const settings = await getPomodoroSettings();
    const state = await getPomodoroState(settings);
    const now = Date.now();
    if (!state.isRunning || !state.endTimeMs) return;

     await reconcileWorldState({ now, pomodoroState: state });

    if (state.endTimeMs > now) {
      await schedulePomodoroAlarm(state);
      return;
    }

    await transitionToNextPhase(state, settings, now, true);
  })();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type?.startsWith("pomodoro:") && !message?.type?.startsWith("world:")) {
    return false;
  }

  void (async () => {
    try {
      const response = message.type.startsWith("world:")
        ? await handleWorldMessage(message)
        : await handlePomodoroMessage(message);
      if (response) {
        sendResponse(response);
        return;
      }
      sendResponse({ ok: false, error: "Unknown worker message" });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || "Worker error" });
    }
  })();

  return true;
});
