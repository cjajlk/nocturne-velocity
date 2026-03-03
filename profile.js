const PROFILE_STORAGE_KEY = "nv_profile";
const PLAYER_STATS_STORAGE_KEY = "nv_player_stats";

const playerStatsDefaults = {
  playerName: "Pilote",
  bestScore: 0,
  bestScoreHardcore: 0,
  worldsReached: 0,
  worldsReachedHardcore: 0,
  comboMax: 0,
  intensityMax: 0,
  intensityMaxHardcore: 0,
  enemiesDestroyed: 0,
  bossesKilled: 0,
  shotsFired: 0,
  shotsHit: 0,
  damageTaken: 0,
  shieldUsed: 0,
  laserUsed: 0,
  hardcoreUnlocked: false,
  hardcoreCompleted: false,
  firstHardcoreWinDate: "",
  totalRuns: 0,
  totalPlayTime: 0
};

const cjAccountDefaults = {
  gameId: "nocturne-velocity",
  balance: 0,
  pendingPlayTime: 0,
  syncEnabled: false,
  lastSyncAt: ""
};

let playerStats = loadPlayerStats();
let playerProfile = loadProfile();
let cjAccount = createCJAccount();
let playtimeInterval = null;

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadProfile() {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  return parsed && typeof parsed === "object" ? parsed : {};
}

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function sanitizePlayerName(value) {
  if (typeof value !== "string") return "Pilote";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length < 3 || cleaned.length > 16) return "Pilote";
  return cleaned;
}

function normalizePlayerStats(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    ...playerStatsDefaults,
    playerName: sanitizePlayerName(source.playerName),
    bestScore: normalizeNumber(source.bestScore),
    bestScoreHardcore: normalizeNumber(source.bestScoreHardcore),
    worldsReached: normalizeNumber(source.worldsReached),
    worldsReachedHardcore: normalizeNumber(source.worldsReachedHardcore),
    comboMax: normalizeNumber(source.comboMax),
    intensityMax: normalizeNumber(source.intensityMax),
    intensityMaxHardcore: normalizeNumber(source.intensityMaxHardcore),
    enemiesDestroyed: normalizeNumber(source.enemiesDestroyed),
    bossesKilled: normalizeNumber(source.bossesKilled),
    shotsFired: normalizeNumber(source.shotsFired),
    shotsHit: normalizeNumber(source.shotsHit),
    damageTaken: normalizeNumber(source.damageTaken),
    shieldUsed: normalizeNumber(source.shieldUsed),
    laserUsed: normalizeNumber(source.laserUsed),
    hardcoreUnlocked: Boolean(source.hardcoreUnlocked),
    hardcoreCompleted: Boolean(source.hardcoreCompleted),
    firstHardcoreWinDate: typeof source.firstHardcoreWinDate === "string" ? source.firstHardcoreWinDate : "",
    totalRuns: normalizeNumber(source.totalRuns),
    totalPlayTime: normalizeNumber(source.totalPlayTime)
  };
}

function loadPlayerStats() {
  const raw = localStorage.getItem(PLAYER_STATS_STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  return normalizePlayerStats(parsed);
}

function savePlayerStats() {
  localStorage.setItem(PLAYER_STATS_STORAGE_KEY, JSON.stringify(playerStats));
}

function createCJAccount() {
  return {
    ...cjAccountDefaults
  };
}

function loadCJAccount() {
  return {
    ...cjAccountDefaults
  };
}

function saveCJAccount() {
  return;
}

function incrementPlaytimeHook(seconds = 1) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  playerStats.totalPlayTime += seconds;
  cjAccount.pendingPlayTime += seconds;
}

function reconcileStatsWithProfile() {
  playerStats.bestScore = Math.max(playerStats.bestScore, normalizeNumber(Number(localStorage.getItem("nv_highscore") || 0)));
  playerStats.hardcoreUnlocked = Boolean(playerStats.hardcoreUnlocked || playerProfile.hardcoreUnlocked);
}

function formatPlayTime(totalSeconds) {
  const value = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("fr-FR");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = String(value);
  el.textContent = text;
  el.title = text;
}

function renderPlayerName() {
  setText("playerNameDisplay", playerStats.playerName || "Pilote");
}

function renderStatsTab() {
  setText("stat-bestScore", playerStats.bestScore);
  setText("stat-bestScoreHardcore", playerStats.bestScoreHardcore);
  setText("stat-worldsReached", playerStats.worldsReached);
  setText("stat-worldsReachedHardcore", playerStats.worldsReachedHardcore);
  setText("stat-comboMax", playerStats.comboMax);
  setText("stat-intensityMax", `x${playerStats.intensityMax.toFixed(1)}`);
  setText("stat-totalRuns", playerStats.totalRuns);
}

function renderCombatTab() {
  const precision = playerStats.shotsFired > 0
    ? Math.min(100, (playerStats.shotsHit / playerStats.shotsFired) * 100)
    : 0;

  setText("combat-enemiesDestroyed", playerStats.enemiesDestroyed);
  setText("combat-bossesKilled", playerStats.bossesKilled);
  setText("combat-shotsFired", playerStats.shotsFired);
  setText("combat-precision", `${precision.toFixed(1)}%`);
  setText("combat-damageTaken", playerStats.damageTaken);
  setText("combat-shieldUsed", playerStats.shieldUsed);
  setText("combat-laserUsed", playerStats.laserUsed);
}

function renderPrestigeTab() {
  const scoreRecordHardcore = Math.max(playerStats.bestScoreHardcore, normalizeNumber(playerProfile.bestScoreHardcore));
  const haloActive = Boolean(playerProfile?.garageUnlocks?.haloCosmique);

  setText("prestige-hardcoreUnlocked", playerStats.hardcoreUnlocked ? "Oui" : "Non");
  setText("prestige-hardcoreCompleted", playerStats.hardcoreCompleted ? "Oui" : "Non");
  setText("prestige-firstHardcoreWinDate", formatDate(playerStats.firstHardcoreWinDate));
  setText("prestige-scoreRecordHardcore", scoreRecordHardcore);
  setText("prestige-haloActive", haloActive ? "Halo actif" : "Inactif");
}

function renderEquipementTab() {
  const alpha = playerProfile?.drones?.alpha;
  const droneMaxLevel = Number.isFinite(alpha?.maxLevel) ? alpha.maxLevel : 0;
  const modulesUnlocked = Array.isArray(playerProfile?.ownedModules) ? playerProfile.ownedModules.length : 0;
  const overclock = Boolean(playerProfile?.garageUnlocks?.droneOverclock);
  const moduleName = playerProfile?.equippedModule || "Aucun module";
  const droneLevel = Number.isFinite(alpha?.level) && alpha.level > 0 ? `Drone alpha niv ${alpha.level}` : "Aucun drone";

  setText("equip-droneMaxLevel", droneMaxLevel);
  setText("equip-modulesUnlocked", modulesUnlocked);
  setText("equip-overclock", overclock ? "Débloqué" : "Verrouillé");
  setText("equip-activeLoadout", `${moduleName} • ${droneLevel}`);
}

function renderCJBlock() {
  setText("cj-balance", `${cjAccount.balance} CJ`);
  setText("cj-status", cjAccount.syncEnabled ? "connecté" : "isolé (préparation)");
}

function renderAll() {
  renderPlayerName();
  renderStatsTab();
  renderCombatTab();
  renderPrestigeTab();
  renderEquipementTab();
  renderCJBlock();
}

function setupNameEditor() {
  const editBtn = document.getElementById("editNameBtn");
  const editor = document.getElementById("nameEditor");
  const input = document.getElementById("playerNameInput");
  const saveBtn = document.getElementById("saveNameBtn");
  const cancelBtn = document.getElementById("cancelNameBtn");
  const errorEl = document.getElementById("nameError");

  if (!editBtn || !editor || !input || !saveBtn || !cancelBtn || !errorEl) return;

  const openEditor = () => {
    input.value = playerStats.playerName || "Pilote";
    errorEl.textContent = "";
    editor.classList.remove("hidden");
    input.focus();
    input.select();
  };

  const closeEditor = () => {
    editor.classList.add("hidden");
    errorEl.textContent = "";
  };

  const saveName = () => {
    const rawValue = input.value || "";
    const cleaned = rawValue.replace(/\s+/g, " ").trim();

    if (cleaned.length < 3 || cleaned.length > 16) {
      errorEl.textContent = "Pseudo: 3 à 16 caractères.";
      return;
    }

    playerStats.playerName = cleaned;
    savePlayerStats();
    renderPlayerName();
    closeEditor();
  };

  editBtn.addEventListener("click", openEditor);
  cancelBtn.addEventListener("click", closeEditor);
  saveBtn.addEventListener("click", saveName);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveName();
    }
    if (event.key === "Escape") {
      closeEditor();
    }
  });
}

function setupTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      panels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${target}`));
    });
  });
}

function setupNavigation() {
  const backBtn = document.getElementById("backToMenu");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => {
    savePlayerStats();
    window.location.href = "menu.html";
  });
}

function setupPlaytimeHook() {
  if (playtimeInterval) {
    clearInterval(playtimeInterval);
  }

  playtimeInterval = setInterval(() => {
    incrementPlaytimeHook(1);
  }, 1000);

  window.addEventListener("beforeunload", () => {
    savePlayerStats();
    saveCJAccount();
  });
}

function initProfilePage() {
  playerStats = normalizePlayerStats(playerStats);
  playerProfile = loadProfile();
  cjAccount = loadCJAccount();

  reconcileStatsWithProfile();
  savePlayerStats();

  setupTabs();
  setupNameEditor();
  setupNavigation();
  setupPlaytimeHook();
  renderAll();
}

document.addEventListener("DOMContentLoaded", initProfilePage);
