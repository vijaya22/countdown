const DEFAULT_WORLD_STATE = {
  panelExpanded: true,
  residentCount: 0,
  nextResidentKind: "cat",
  nextResidentLabel: "Cat",
  recentResidentId: null,
  spawnedResidents: []
};

const FRIEND_ART = {
  cat: `
    <svg viewBox="0 0 90 90" aria-hidden="true">
      <ellipse cx="42" cy="48" rx="18" ry="18" fill="#74606b"></ellipse>
      <circle cx="57" cy="37" r="13" fill="#74606b"></circle>
      <polygon points="48,30 53,18 57,31" fill="#74606b"></polygon>
      <polygon points="58,31 65,19 68,33" fill="#74606b"></polygon>
      <circle cx="53" cy="38" r="2.1" fill="#241d21"></circle>
      <circle cx="61" cy="38" r="2.1" fill="#241d21"></circle>
      <ellipse cx="57" cy="45" rx="3.8" ry="2.7" fill="#f0b3b2"></ellipse>
      <path d="M25 50c-8 0-11 9-5 15" stroke="#74606b" stroke-width="5" stroke-linecap="round" fill="none"></path>
      <rect x="31" y="58" width="5" height="14" rx="2.5" fill="#63505d"></rect>
      <rect x="47" y="58" width="5" height="14" rx="2.5" fill="#63505d"></rect>
    </svg>
  `,
  flower: `
    <svg viewBox="0 0 90 90" aria-hidden="true">
      <path d="M45 63V33" stroke="#4f8b53" stroke-width="6" stroke-linecap="round"></path>
      <path d="M45 48c-7-1-11-6-12-12" stroke="#4f8b53" stroke-width="4" stroke-linecap="round" fill="none"></path>
      <path d="M45 43c7 0 12-4 14-11" stroke="#4f8b53" stroke-width="4" stroke-linecap="round" fill="none"></path>
      <circle cx="45" cy="27" r="9" fill="#f2b34f"></circle>
      <circle cx="45" cy="14" r="10" fill="#ef7393"></circle>
      <circle cx="32" cy="21" r="10" fill="#ef7393"></circle>
      <circle cx="58" cy="21" r="10" fill="#ef7393"></circle>
      <circle cx="36" cy="36" r="10" fill="#ef7393"></circle>
      <circle cx="54" cy="36" r="10" fill="#ef7393"></circle>
    </svg>
  `,
  bee: `
    <svg viewBox="0 0 90 90" aria-hidden="true">
      <ellipse cx="45" cy="40" rx="15" ry="11" fill="#f4c54f"></ellipse>
      <ellipse cx="34" cy="30" rx="10" ry="8" fill="rgba(214,236,248,0.85)"></ellipse>
      <ellipse cx="56" cy="30" rx="10" ry="8" fill="rgba(214,236,248,0.85)"></ellipse>
      <rect x="37" y="31" width="4" height="18" rx="2" fill="#2f2d2b"></rect>
      <rect x="45" y="31" width="4" height="18" rx="2" fill="#2f2d2b"></rect>
      <rect x="53" y="31" width="4" height="18" rx="2" fill="#2f2d2b"></rect>
      <circle cx="58" cy="39" r="2" fill="#2f2d2b"></circle>
      <circle cx="33" cy="40" r="3" fill="#2f2d2b"></circle>
    </svg>
  `,
  bunny: `
    <svg viewBox="0 0 90 90" aria-hidden="true">
      <ellipse cx="43" cy="49" rx="18" ry="16" fill="#f3efe9"></ellipse>
      <circle cx="57" cy="39" r="12" fill="#f3efe9"></circle>
      <ellipse cx="52" cy="20" rx="5" ry="15" fill="#f3efe9"></ellipse>
      <ellipse cx="63" cy="18" rx="5" ry="16" fill="#f3efe9"></ellipse>
      <ellipse cx="52" cy="22" rx="2.5" ry="10" fill="#ebb7bd"></ellipse>
      <ellipse cx="63" cy="20" rx="2.5" ry="11" fill="#ebb7bd"></ellipse>
      <circle cx="54" cy="39" r="1.9" fill="#2d2725"></circle>
      <circle cx="61" cy="39" r="1.9" fill="#2d2725"></circle>
      <ellipse cx="58" cy="45" rx="3.5" ry="2.6" fill="#ebb7bd"></ellipse>
    </svg>
  `,
  tulip: `
    <svg viewBox="0 0 90 90" aria-hidden="true">
      <path d="M45 63V28" stroke="#518f5b" stroke-width="6" stroke-linecap="round"></path>
      <path d="M45 46c-8 0-13-5-14-11" stroke="#518f5b" stroke-width="4" stroke-linecap="round" fill="none"></path>
      <path d="M45 41c7 0 12-4 13-10" stroke="#518f5b" stroke-width="4" stroke-linecap="round" fill="none"></path>
      <path d="M45 14l10 8-3 13H38l-3-13 10-8z" fill="#f17d56"></path>
    </svg>
  `,
  mushroom: `
    <svg viewBox="0 0 90 90" aria-hidden="true">
      <rect x="37" y="38" width="16" height="24" rx="8" fill="#efe7d8"></rect>
      <path d="M23 40c0-13 11-23 24-23s24 10 24 23H23z" fill="#d66163"></path>
      <circle cx="35" cy="30" r="4" fill="#fff4ef"></circle>
      <circle cx="49" cy="26" r="4.5" fill="#fff4ef"></circle>
      <circle cx="58" cy="33" r="3.8" fill="#fff4ef"></circle>
    </svg>
  `
};

const FRIEND_LAYOUTS = {
  cat: { className: "companion-friend-cat", left: 16, bottom: 30 },
  flower: { className: "companion-friend-flower", left: 82, bottom: 26 },
  bee: { className: "companion-friend-bee", left: 58, bottom: 80 },
  bunny: { className: "companion-friend-bunny", left: 34, bottom: 28 },
  tulip: { className: "companion-friend-tulip", left: 50, bottom: 26 },
  mushroom: { className: "companion-friend-mushroom", left: 66, bottom: 24 }
};

const DOG_SHEETS = {
  walk: { src: "assets/dog-walk-sprite.png", frameCount: 6, totalFrames: 6, frames: [0, 1, 2, 3, 4, 5], frameDurationMs: 170 },
  sit: { src: "assets/dog-sit-sprite.png", frameCount: 11, totalFrames: 6, frames: [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1], frameDurationMs: 220 },
  sniff: { src: "assets/dog-sniff-sprite.png", frameCount: 10, totalFrames: 6, frames: [0, 1, 2, 3, 4, 4, 4, 3, 2, 1], frameDurationMs: 190 },
  wiggle: { src: "assets/dig-wiggle-sprite.png", frameCount: 6, totalFrames: 6, frames: [0, 1, 2, 3, 4, 5], frameDurationMs: 150 },
  jump: { src: "assets/dog-jump-sprite.png", frameCount: 6, totalFrames: 6, frames: [0, 1, 2, 3, 4, 5], frameDurationMs: 120 }
};
const DOG_BEHAVIOR_WEIGHTS = [
  { state: "sit", weight: 0.34 },
  { state: "sniff", weight: 0.4 },
  { state: "wiggle", weight: 0.26 }
];
const DOG_SPEED = 58;
const DOG_JUMP_HEIGHT = 18;
const DOG_BEHAVIOR_DURATIONS_MS = {
  sit: 3000,
  sniff: 2200,
  wiggle: 1800,
  jump: 760
};
const DOG_WALK_BEHAVIOR_MIN_MS = 4200;
const DOG_WALK_BEHAVIOR_VARIANCE_MS = 2600;

function normalizeWorldState(state) {
  return {
    ...DEFAULT_WORLD_STATE,
    ...(state && typeof state === "object" ? state : {}),
    spawnedResidents: Array.isArray(state?.spawnedResidents) ? state.spawnedResidents : []
  };
}

function sortResidents(residents) {
  return [...residents].sort((a, b) => {
    const left = typeof a.spawnedAt === "number" ? a.spawnedAt : 0;
    const right = typeof b.spawnedAt === "number" ? b.spawnedAt : 0;
    return left - right;
  });
}

function buildArrivalBanner(state) {
  const latestResident = state.spawnedResidents.find((resident) => resident.id === state.recentResidentId);
  if (!latestResident) return "";
  return `
    <div class="companion-arrival-banner">
      <span class="companion-arrival-pill">New friend</span>
      <strong>${latestResident.label}</strong>
      <span>joined your dog</span>
    </div>
  `;
}

function buildFriendMarkup(resident, index, recentResidentId) {
  const layout = FRIEND_LAYOUTS[resident.kind];
  if (!layout) return "";

  const duplicateOffset = Math.floor(index / Object.keys(FRIEND_LAYOUTS).length);
  const recentClass = resident.id === recentResidentId ? " is-recent" : "";
  const left = `calc(${layout.left}% + ${duplicateOffset * 32}px)`;
  const bottom = layout.bottom + duplicateOffset * 8;
  return `
    <div class="companion-friend ${layout.className}${recentClass}" style="left:${left}; bottom:${bottom}px;">
      <div class="companion-friend-art">
        ${FRIEND_ART[resident.kind] || FRIEND_ART.flower}
      </div>
    </div>
  `;
}

function buildHabitatMarkup(state) {
  const residents = sortResidents(state.spawnedResidents);
  return `
    <div class="companion-habitat-scene">
      <div class="companion-habitat-sky"></div>
      ${buildArrivalBanner(state)}
      <div class="companion-ground companion-ground-back"></div>
      <div class="companion-ground"></div>
      <div class="companion-ground companion-ground-accent"></div>
      <div class="companion-friends">
        ${residents.map((resident, index) => buildFriendMarkup(resident, index, state.recentResidentId)).join("")}
      </div>
      <button class="companion-dog" type="button" aria-label="Pet the dog">
        <span class="companion-dog-shadow" aria-hidden="true"></span>
        <span class="companion-dog-sprite" aria-hidden="true"></span>
        <span class="companion-dog-bubble" aria-hidden="true"></span>
      </button>
    </div>
  `;
}

const habitat = {
  container: null,
  scene: null,
  dogButton: null,
  dogSprite: null,
  bubble: null,
  x: 48,
  direction: 1,
  state: "walk",
  previousState: "walk",
  currentSheetKey: "walk",
  currentFrameCount: DOG_SHEETS.walk.frameCount,
  currentSheetFrames: DOG_SHEETS.walk.frames,
  currentSheetTotalFrames: DOG_SHEETS.walk.totalFrames,
  frameIndex: 0,
  frameTimer: 0,
  lastTs: 0,
  stateStartedAt: 0,
  stateEndsAt: 0,
  nextBehaviorAt: 0,
  previousAmbientState: null,
  reactionTimer: null,
  rafId: 0
};

let isCompanionEnabled = true;

function setHabitatVisibility(enabled) {
  const container = document.getElementById("focusWorldHabitat");
  if (!container) return;
  container.hidden = !enabled;
  if (!enabled) {
    container.replaceChildren();
  }
}

function getDogBounds() {
  const sceneWidth = habitat.scene?.clientWidth || habitat.container?.clientWidth || 0;
  const dogWidth = habitat.dogButton?.offsetWidth || 132;
  const minX = 20;
  const rightInset = window.innerWidth <= 640 ? 168 : 236;
  const maxX = Math.max(minX, sceneWidth - dogWidth - rightInset);
  return { minX, maxX };
}

function setDogFacing() {
  if (!habitat.dogButton) return;
  habitat.dogButton.classList.toggle("is-facing-left", habitat.direction < 0);
}

function getDogSheet(sheetKey) {
  return DOG_SHEETS[sheetKey] || DOG_SHEETS.walk;
}

function setDogSheet(sheetKey) {
  const nextSheet = getDogSheet(sheetKey);
  if (!habitat.dogSprite) return;
  const hasChanged = habitat.currentSheetKey !== sheetKey;
  habitat.currentSheetKey = sheetKey;
  habitat.currentFrameCount = nextSheet.frameCount;
  habitat.currentSheetFrames = nextSheet.frames || DOG_SHEETS.walk.frames;
  habitat.currentSheetTotalFrames = nextSheet.totalFrames || nextSheet.frameCount;
  habitat.dogSprite.style.backgroundImage = `url("${nextSheet.src}")`;
  if (hasChanged) {
    habitat.frameIndex = 0;
    habitat.frameTimer = 0;
  }
  setDogFrame(habitat.frameIndex);
}

function setDogFrame(index) {
  if (!habitat.dogSprite) return;
  const frameCount = habitat.currentFrameCount || DOG_SHEETS.walk.frameCount;
  const safeIndex = ((index % frameCount) + frameCount) % frameCount;
  const frameMap = habitat.currentSheetFrames || DOG_SHEETS.walk.frames;
  const sheetFrameIndex = frameMap[safeIndex] ?? safeIndex;
  habitat.frameIndex = safeIndex;
  const frameWidth = habitat.dogSprite.clientWidth || habitat.dogSprite.offsetWidth || 0;
  habitat.dogSprite.style.backgroundPositionX = `${sheetFrameIndex * frameWidth * -1}px`;
}

function showDogReaction(text) {
  if (!habitat.bubble) return;
  habitat.bubble.textContent = text;
  habitat.bubble.classList.remove("show");
  void habitat.bubble.offsetWidth;
  habitat.bubble.classList.add("show");

  if (habitat.reactionTimer) clearTimeout(habitat.reactionTimer);
  habitat.reactionTimer = setTimeout(() => {
    habitat.bubble?.classList.remove("show");
  }, 900);
}

function scheduleNextBehavior(ts) {
  habitat.nextBehaviorAt =
    ts + DOG_WALK_BEHAVIOR_MIN_MS + Math.random() * DOG_WALK_BEHAVIOR_VARIANCE_MS;
}

function getRandomDuration(baseMs, varianceMs) {
  return baseMs + Math.round((Math.random() * 2 - 1) * varianceMs);
}

function getNextBehavior() {
  const previous = habitat.previousAmbientState;
  const pool = DOG_BEHAVIOR_WEIGHTS.map((entry) => {
    if (entry.state === previous) {
      return {
        ...entry,
        weight: Math.random() < 0.18 ? entry.weight : entry.weight * 0.2
      };
    }
    return entry;
  });

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let target = Math.random() * totalWeight;
  for (const entry of pool) {
    target -= entry.weight;
    if (target <= 0) {
      habitat.previousAmbientState = entry.state;
      return entry.state;
    }
  }

  const fallback = pool[pool.length - 1]?.state || "sniff";
  habitat.previousAmbientState = fallback;
  return fallback;
}

function enterDogState(state, ts, options = {}) {
  habitat.state = state;
  habitat.stateStartedAt = ts;
  habitat.previousState = options.previousState || habitat.previousState || "walk";
  habitat.dogButton?.classList.toggle("is-jumping", state === "jump");

  if (state === "walk") {
    habitat.stateEndsAt = 0;
    setDogSheet("walk");
    scheduleNextBehavior(ts);
    return;
  }

  const sheetKey = state === "jump" ? "jump" : state;
  setDogSheet(sheetKey);
  habitat.frameIndex = 0;
  habitat.frameTimer = 0;
  setDogFrame(0);
  const baseDuration = DOG_BEHAVIOR_DURATIONS_MS[state] || 1200;
  const variance = state === "sit" ? 700 : state === "sniff" ? 500 : state === "wiggle" ? 350 : 120;
  habitat.stateEndsAt = ts + Math.max(500, getRandomDuration(baseDuration, variance));
}

function triggerDogJump(ts = performance.now()) {
  if (habitat.state === "jump") return;
  showDogReaction(Math.random() > 0.5 ? "Woof!" : "❤");
  enterDogState("jump", ts, { previousState: habitat.state });
}

function onDogClick(event) {
  event.preventDefault();
  triggerDogJump(performance.now());
}

function syncDogPosition(forceReset = false) {
  const { minX, maxX } = getDogBounds();
  if (forceReset) {
    habitat.x = Math.min(Math.max(habitat.x, minX), maxX);
  } else if (habitat.x > maxX || habitat.x < minX) {
    habitat.x = minX;
  }
  setDogFacing();
}

function stepDog(ts) {
  if (!habitat.scene || !habitat.dogButton || !habitat.dogSprite) return;

  if (!habitat.lastTs) habitat.lastTs = ts;
  const dtMs = Math.min(48, ts - habitat.lastTs);
  habitat.lastTs = ts;
  const dt = dtMs / 1000;
  const { minX, maxX } = getDogBounds();

  if (!habitat.state) {
    enterDogState("walk", ts);
  }

  const currentSheet = getDogSheet(habitat.currentSheetKey);
  habitat.frameTimer += dtMs;
  if (habitat.frameTimer >= currentSheet.frameDurationMs) {
    habitat.frameTimer = habitat.frameTimer % currentSheet.frameDurationMs;
    setDogFrame(habitat.frameIndex + 1);
  }

  if (habitat.state === "walk") {
    habitat.x += habitat.direction * DOG_SPEED * dt;
    if (habitat.x >= maxX) {
      habitat.x = maxX;
      habitat.direction = -1;
      setDogFacing();
      enterDogState(getNextBehavior(), ts);
    } else if (habitat.x <= minX) {
      habitat.x = minX;
      habitat.direction = 1;
      setDogFacing();
      enterDogState(getNextBehavior(), ts);
    } else if (ts >= habitat.nextBehaviorAt) {
      enterDogState(getNextBehavior(), ts);
    }
  } else if (habitat.stateEndsAt && ts >= habitat.stateEndsAt) {
    enterDogState("walk", ts);
  }

  let jumpOffset = 0;
  if (habitat.state === "jump") {
    const jumpDuration = DOG_BEHAVIOR_DURATIONS_MS.jump;
    const jumpProgress = Math.min(1, (ts - habitat.stateStartedAt) / jumpDuration);
    jumpOffset = Math.sin(jumpProgress * Math.PI) * DOG_JUMP_HEIGHT;
  }

  habitat.dogButton.style.transform = `translate3d(${habitat.x}px, ${Math.round(-jumpOffset)}px, 0)`;
}

function animationLoop(ts) {
  if (!isCompanionEnabled) {
    habitat.rafId = 0;
    return;
  }
  stepDog(ts);
  habitat.rafId = window.requestAnimationFrame(animationLoop);
}

function startAnimationLoop() {
  if (habitat.rafId) return;
  habitat.rafId = window.requestAnimationFrame(animationLoop);
}

function attachScene(scene) {
  if (!scene) return;
  habitat.scene = scene;
  habitat.container = scene.parentElement;
  habitat.dogButton = scene.querySelector(".companion-dog");
  habitat.dogSprite = scene.querySelector(".companion-dog-sprite");
  habitat.bubble = scene.querySelector(".companion-dog-bubble");
  habitat.lastTs = 0;
  habitat.frameTimer = 0;
  setDogSheet(habitat.state === "jump" ? "jump" : habitat.state || "walk");
  setDogFrame(habitat.frameIndex);
  setDogFacing();
  syncDogPosition(true);
  habitat.dogButton?.addEventListener("click", onDogClick);
  startAnimationLoop();
}

function render(state) {
  const container = document.getElementById("focusWorldHabitat");
  if (!container) return;
  if (!isCompanionEnabled) {
    setHabitatVisibility(false);
    return;
  }
  const normalized = normalizeWorldState(state);
  setHabitatVisibility(true);
  container.innerHTML = buildHabitatMarkup(normalized);
  attachScene(container.querySelector(".companion-habitat-scene"));
}

let announcementTimer = null;
let announcedResidentId = null;

function syncArrivalAnnouncement(state) {
  const normalized = normalizeWorldState(state);
  if (!normalized.recentResidentId || normalized.recentResidentId === announcedResidentId) {
    return normalized;
  }

  announcedResidentId = normalized.recentResidentId;
  if (announcementTimer) clearTimeout(announcementTimer);

  announcementTimer = setTimeout(() => {
    const current = window.__focusWorldState || DEFAULT_WORLD_STATE;
    if (!current.recentResidentId) return;
    window.__focusWorldState = {
      ...current,
      recentResidentId: null
    };
    render(window.__focusWorldState);
  }, 4200);

  return normalized;
}

function boot() {
  window.addEventListener("focusworld:enabled", (event) => {
    isCompanionEnabled = event.detail?.enabled !== false;
    if (!isCompanionEnabled) {
      if (habitat.rafId) {
        window.cancelAnimationFrame(habitat.rafId);
        habitat.rafId = 0;
      }
      setHabitatVisibility(false);
      return;
    }

    const state = window.__focusWorldState || DEFAULT_WORLD_STATE;
    render(state);
  });

  window.addEventListener("focusworld:update", (event) => {
    const nextState = syncArrivalAnnouncement(event.detail);
    window.__focusWorldState = nextState;
    render(nextState);
  });

  window.addEventListener("focusworld:theme", () => {
    const state = window.__focusWorldState || DEFAULT_WORLD_STATE;
    render(state);
  });

  window.addEventListener("resize", () => {
    syncDogPosition(true);
  });

  render(DEFAULT_WORLD_STATE);
  window.dispatchEvent(new CustomEvent("focusworld:ready"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
