// ==========================
// LOAD PROFILE
// ==========================

function loadProfile() {
    const data = localStorage.getItem("nv_profile");
    if (!data) return null;

    try {
        const parsed = JSON.parse(data);
        return {
            ...parsed,
            hardcoreUnlocked: Boolean(parsed.hardcoreUnlocked),
            hardcoreMode: Boolean(parsed.hardcoreMode),
            world4Completed: Boolean(parsed.world4Completed || parsed.monde4Termine),
            garageComplet: Boolean(parsed.garageComplet)
        };
    } catch {
        return null;
    }
}

function saveProfile() {
    if (!profile) return;
    refreshHardcoreUnlockState(false);
    profile.monde4Termine = Boolean(profile.world4Completed);
    profile.moduleCatalog = sanitizeModuleCatalog(profile.moduleCatalog);
    localStorage.setItem("nv_profile", JSON.stringify(profile));
}

function savePlayerProfile() {
    saveProfile();
}

const REQUIRED_MODULE_IDS = ["flux", "impact", "resonance", "lazer", "nova"];
const PLAYER_STATS_STORAGE_KEY = "nv_player_stats";
const DEFAULT_MODULE_CATALOG = {
    flux: { cooldown: 340, energyCost: 10, damage: 1 },
    impact: { cooldown: 620, energyCost: 22, damage: 5 },
    resonance: { cooldown: 370, energyCost: 10, damage: 1 },
    lazer: { cooldown: 260, energyCost: 12, damage: 1 },
    nova: { cooldown: 520, energyCost: 20, damage: 3 }
};

function normalizeDroneId(droneId) {
    if (!droneId) return null;
    const value = String(droneId).toLowerCase().trim();
    const directMatch = value.match(/^drone\s*[-_]?\s*([1-6])$/);
    if (directMatch) return Number(directMatch[1]);
    const anyDigit = value.match(/([1-6])/);
    if (anyDigit) return Number(anyDigit[1]);
    return null;
}

function createDefaultDronesState() {
    return {
        alpha: { unlocked: false, level: 0, maxLevel: 5 },
        beta: { unlocked: false, level: 0, maxLevel: 5 },
        gamma: { unlocked: false, level: 0, maxLevel: 5 }
    };
}

function createDefaultGarageUnlocks() {
    return {
        droneOverclock: false,
        haloCosmique: false
    };
}

function normalizeShipId(shipId) {
    if (typeof shipId !== "string") return null;
    const cleaned = shipId.trim().toLowerCase().replace(/\.png$/i, "");
    return /^vaisseau\d+$/.test(cleaned) ? cleaned : null;
}

function sanitizeModuleCatalog(source) {
    const catalog = source && typeof source === "object" ? source : {};
    const result = {};

    for (const moduleId of REQUIRED_MODULE_IDS) {
        const fallback = DEFAULT_MODULE_CATALOG[moduleId];
        const value = catalog[moduleId] || {};
        result[moduleId] = {
            cooldown: Number.isFinite(value.cooldown) ? value.cooldown : fallback.cooldown,
            energyCost: Number.isFinite(value.energyCost) ? value.energyCost : fallback.energyCost,
            damage: Number.isFinite(value.damage) ? value.damage : fallback.damage
        };
    }

    return result;
}

function createDefaultPlayerStats() {
    return {
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
}

function normalizePlayerStats(source) {
    const base = createDefaultPlayerStats();
    const input = source && typeof source === "object" ? source : {};
    const normalized = { ...base };

    Object.keys(base).forEach((key) => {
        if (typeof base[key] === "boolean") {
            normalized[key] = Boolean(input[key]);
        } else if (typeof base[key] === "number") {
            normalized[key] = Number.isFinite(input[key]) ? input[key] : base[key];
        } else {
            normalized[key] = typeof input[key] === "string" ? input[key] : base[key];
        }
    });

    return normalized;
}

function loadPlayerStats() {
    const raw = localStorage.getItem(PLAYER_STATS_STORAGE_KEY);
    if (!raw) return createDefaultPlayerStats();
    try {
        return normalizePlayerStats(JSON.parse(raw));
    } catch {
        return createDefaultPlayerStats();
    }
}

function savePlayerStats() {
    localStorage.setItem(PLAYER_STATS_STORAGE_KEY, JSON.stringify(playerStats));
}

function createRunMetrics() {
    return {
        enemiesDestroyed: 0,
        bossesKilled: 0,
        shotsFired: 0,
        shotsHit: 0,
        damageTaken: 0,
        shieldUsed: 0,
        laserUsed: 0,
        playTime: 0,
        maxWorldReached: 1
    };
}

function sanitizeDrone(source, fallbackMax = 5) {
    const maxLevel = Number.isFinite(source?.maxLevel) && source.maxLevel > 0
        ? Math.floor(source.maxLevel)
        : fallbackMax;
    const unlocked = Boolean(source?.unlocked);
    const levelRaw = Number.isFinite(source?.level) ? Math.floor(source.level) : 0;
    const level = Math.max(0, Math.min(maxLevel, levelRaw));
    return {
        unlocked: unlocked && level > 0,
        level: unlocked ? level : 0,
        maxLevel
    };
}

let profile = loadProfile();
const legacyModuleMap = {
    rapid: "flux",
    heavy: "impact"
};

if (profile) {
    if (legacyModuleMap[profile.equippedModule]) {
        profile.equippedModule = legacyModuleMap[profile.equippedModule];
    }
    if (Array.isArray(profile.ownedModules)) {
        profile.ownedModules = profile.ownedModules.map(moduleId => legacyModuleMap[moduleId] || moduleId);
        profile.ownedModules = [...new Set(profile.ownedModules)];
    }

    const dronesState = createDefaultDronesState();
    if (profile.drones && typeof profile.drones === "object") {
        dronesState.alpha = sanitizeDrone(profile.drones.alpha, 5);
        dronesState.beta = sanitizeDrone(profile.drones.beta, 5);
        dronesState.gamma = sanitizeDrone(profile.drones.gamma, 5);
    } else {
        const legacyLevels = [];
        if (Array.isArray(profile.ownedDrones)) {
            profile.ownedDrones
                .map(normalizeDroneId)
                .filter(Boolean)
                .forEach(level => legacyLevels.push(level));
        }
        const equippedLegacy = normalizeDroneId(profile.equippedDrone);
        if (equippedLegacy) {
            legacyLevels.push(equippedLegacy);
        }
        const legacyAlphaLevel = legacyLevels.length > 0 ? Math.max(...legacyLevels) : 0;
        if (legacyAlphaLevel > 0) {
            dronesState.alpha.unlocked = true;
            dronesState.alpha.level = Math.min(dronesState.alpha.maxLevel, legacyAlphaLevel);
        }
    }

    profile.drones = dronesState;
    profile.ownedDrones = dronesState.alpha.unlocked ? [`drone${dronesState.alpha.level}`] : [];
    profile.equippedDrone = dronesState.alpha.unlocked ? "alpha" : null;
    profile.garageUnlocks = {
        ...createDefaultGarageUnlocks(),
        ...(profile.garageUnlocks || {})
    };
    profile.world4Completed = Boolean(profile.world4Completed || profile.monde4Termine);
    profile.garageComplet = Boolean(profile.garageComplet);
    profile.hardcoreUnlocked = Boolean(profile.hardcoreUnlocked);
    profile.hardcoreMode = Boolean(profile.hardcoreMode);
    const normalizedOwnedShips = Array.isArray(profile.ownedShips)
        ? profile.ownedShips.map(normalizeShipId).filter(Boolean)
        : [];
    if (!normalizedOwnedShips.includes("vaisseau1")) {
        normalizedOwnedShips.unshift("vaisseau1");
    }
    profile.ownedShips = [...new Set(normalizedOwnedShips)];
    const normalizedEquippedShip = normalizeShipId(profile.equippedShip);
    profile.equippedShip = normalizedEquippedShip && profile.ownedShips.includes(normalizedEquippedShip)
        ? normalizedEquippedShip
        : "vaisseau1";
    profile.moduleCatalog = sanitizeModuleCatalog(profile.moduleCatalog);
    saveProfile();
} else {
    profile = {
        credits: 0,
        ownedModules: [],
        ownedShips: ["vaisseau1"],
        ownedDrones: [],
        equippedModule: null,
        equippedShip: "vaisseau1",
        equippedDrone: null,
        drones: createDefaultDronesState(),
        garageUnlocks: createDefaultGarageUnlocks(),
        world4Completed: false,
        monde4Termine: false,
        garageComplet: false,
        hardcoreUnlocked: false,
        hardcoreMode: false,
        moduleCatalog: sanitizeModuleCatalog(null)
    };

    saveProfile();
}
let highScore = Number(localStorage.getItem("nv_highscore") || 0);
let playerStats = loadPlayerStats();
let runMetrics = createRunMetrics();
let runMetricsCommitted = false;
let maxIntensityReached = 1;
let gameOverStatsSaved = false;
let isNewRecord = false;
let gameOverAnimStart = null;
const isMobileDevice = /Mobi|Android|iPhone/i.test(navigator.userAgent);

function safeParseJSON(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function loadOptionsGroup(storageKey, defaults) {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? safeParseJSON(raw) : null;
    if (!parsed || typeof parsed !== "object") {
        return { ...defaults };
    }
    return { ...defaults, ...parsed };
}

const gameplayAudioOptions = loadOptionsGroup("nv_options_audio", {
    masterVolume: 100,
    sfxVolume: 85,
    muteAll: false
});

const gameplayControlOptions = loadOptionsGroup("nv_options_gameplay", {
    autoFireTouch: true,
    combatSpeed: 100
});

const gameplayGraphicsOptions = loadOptionsGroup("nv_options_graphics", {
    brightness: 100,
    contrast: 100,
    screenShake: true
});

const gameplayUIOptions = loadOptionsGroup("nv_options_ui", {
    hudScale: 100
});

const baseMasterVolume = Math.max(0, Math.min(100, Number(gameplayAudioOptions.masterVolume) || 100));
const baseSfxVolume = Math.max(0, Math.min(100, Number(gameplayAudioOptions.sfxVolume) || 85));
const isMuted = Boolean(gameplayAudioOptions.muteAll);
const sfxVolumeMultiplier = isMuted ? 0 : (baseMasterVolume / 100) * (baseSfxVolume / 100);

const combatSpeedSetting = Math.max(80, Math.min(120, Number(gameplayControlOptions.combatSpeed) || 100));
const combatSpeedMultiplier = combatSpeedSetting / 100;
const autoFireTouchEnabled = Boolean(gameplayControlOptions.autoFireTouch);
const graphicsBrightness = Math.max(80, Math.min(120, Number(gameplayGraphicsOptions.brightness) || 100));
const graphicsContrast = Math.max(80, Math.min(120, Number(gameplayGraphicsOptions.contrast) || 100));
const screenShakeEnabled = Boolean(gameplayGraphicsOptions.screenShake);
const hudScaleValue = Math.max(80, Math.min(130, Number(gameplayUIOptions.hudScale) || 100)) / 100;
let flashFilterBoostActive = false;

function isGarageComplete(profileState) {
    if (!profileState) return false;

    const ownedModules = Array.isArray(profileState.ownedModules) ? profileState.ownedModules : [];
    const hasAllModules = REQUIRED_MODULE_IDS.every(moduleId => ownedModules.includes(moduleId));
    const alpha = profileState?.drones?.alpha;
    const alphaMaxed = Boolean(alpha?.unlocked) && Number(alpha?.level) >= Number(alpha?.maxLevel || 5);
    const hasOverclock = Boolean(profileState?.garageUnlocks?.droneOverclock);
    const hasHalo = Boolean(profileState?.garageUnlocks?.haloCosmique);

    return hasAllModules && alphaMaxed && hasOverclock && hasHalo;
}

function showHardcoreUnlockMessage() {
    showPickupMessage("MODE HARDCORE DÉBLOQUÉ");
    pickupMessageTimer = Math.max(pickupMessageTimer, 3);
}

function refreshHardcoreUnlockState(showMessage = false) {
    if (!profile) return;

    profile.garageComplet = isGarageComplete(profile);
    const shouldUnlock = Boolean(profile.world4Completed) && Boolean(profile.garageComplet);
    if (shouldUnlock && !profile.hardcoreUnlocked) {
        profile.hardcoreUnlocked = true;
        if (showMessage) {
            showHardcoreUnlockMessage();
        }
    }
}

function updateRunWorldReached(nextWorldValue) {
    if (!Number.isFinite(nextWorldValue)) return;
    runMetrics.maxWorldReached = Math.max(runMetrics.maxWorldReached, Math.floor(nextWorldValue));
}

function commitRunStats() {
    if (!runMetrics || runMetricsCommitted) return;

    playerStats.enemiesDestroyed += runMetrics.enemiesDestroyed;
    playerStats.bossesKilled += runMetrics.bossesKilled;
    playerStats.shotsFired += runMetrics.shotsFired;
    playerStats.shotsHit += runMetrics.shotsHit;
    playerStats.damageTaken += runMetrics.damageTaken;
    playerStats.shieldUsed += runMetrics.shieldUsed;
    playerStats.laserUsed += runMetrics.laserUsed;
    playerStats.totalPlayTime += runMetrics.playTime;

    playerStats.comboMax = Math.max(playerStats.comboMax, comboPeak);
    playerStats.intensityMax = Math.max(playerStats.intensityMax, maxIntensityReached);
    playerStats.bestScore = Math.max(playerStats.bestScore, ui.score);
    playerStats.hardcoreUnlocked = Boolean(playerStats.hardcoreUnlocked || profile?.hardcoreUnlocked);

    if (isHardcoreMode) {
        playerStats.bestScoreHardcore = Math.max(playerStats.bestScoreHardcore, ui.score);
        playerStats.worldsReachedHardcore = Math.max(playerStats.worldsReachedHardcore, runMetrics.maxWorldReached);
        playerStats.intensityMaxHardcore = Math.max(playerStats.intensityMaxHardcore, maxIntensityReached);

        if (runMetrics.maxWorldReached >= 4) {
            playerStats.hardcoreCompleted = true;
            if (!playerStats.firstHardcoreWinDate) {
                playerStats.firstHardcoreWinDate = new Date().toISOString();
            }
        }
    } else {
        playerStats.worldsReached = Math.max(playerStats.worldsReached, runMetrics.maxWorldReached);
    }

    runMetricsCommitted = true;
    savePlayerStats();
}

function saveScore(score) {

    let scores = JSON.parse(localStorage.getItem("nv_scores")) || [];

    scores.push(score);

    scores.sort((a, b) => b - a);

    scores = scores.slice(0, 5);

    localStorage.setItem("nv_scores", JSON.stringify(scores));
}

// ============================
// HUD
// ============================
function drawHUD() {
    // HUD Vie
    ctx.save();
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "#00ffff";
    ctx.strokeStyle = "#003344";
    ctx.lineWidth = 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    // Affichage des vies
    const hudY = 90;
    ctx.strokeText("Vies : " + ui.lives, 24, hudY);
    ctx.fillText("Vies : " + ui.lives, 24, hudY);

    // HUD Objectif kills
    ctx.font = "bold 20px Arial";
    ctx.strokeText("A détruire : " + state.killsThisWave + " / " + state.killsTarget, 24, hudY + 30);
    ctx.fillText("A détruire : " + state.killsThisWave + " / " + state.killsTarget, 24, hudY + 30);

    if (comboCount > 1) {
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = comboPopupTimer > 0 ? "#fff7a0" : "#7df5ff";
        ctx.strokeStyle = "rgba(0, 20, 35, 0.85)";
        ctx.strokeText(`COMBO x${comboCount}  •  SCORE x${getComboMultiplier().toFixed(2)}`, 24, hudY + 58);
        ctx.fillText(`COMBO x${comboCount}  •  SCORE x${getComboMultiplier().toFixed(2)}`, 24, hudY + 58);
    }

    if (activeBuff.timeLeft > 0) {
        ctx.font = "bold 17px Arial";
        ctx.fillStyle = "#b3ff8a";
        const buffText = activeBuff.type === "overdrive" ? "OVERDRIVE" : activeBuff.type;
        ctx.strokeText(`${buffText} ${activeBuff.timeLeft.toFixed(1)}s`, 24, hudY + 84);
        ctx.fillText(`${buffText} ${activeBuff.timeLeft.toFixed(1)}s`, 24, hudY + 84);
    }

    if (shieldTimeLeft > 0) {
        ctx.font = "bold 17px Arial";
        ctx.fillStyle = "#9fe8ff";
        ctx.strokeText(`BOUCLIER ${shieldTimeLeft.toFixed(1)}s`, 24, hudY + 102);
        ctx.fillText(`BOUCLIER ${shieldTimeLeft.toFixed(1)}s`, 24, hudY + 102);
    }

    if (pickupMessageTimer > 0 && pickupMessage) {
        ctx.font = "bold 17px Arial";
        ctx.fillStyle = "#d8c8ff";
        const pickupY = shieldTimeLeft > 0 ? hudY + 126 : hudY + 108;
        ctx.strokeText(pickupMessage, 24, pickupY);
        ctx.fillText(pickupMessage, 24, pickupY);
    }

    if (activeModuleId === "lazer") {
        const lazerPercent = Math.round((lazerCharge / LAZER_CHARGE_MAX) * 100);
        const lazerY = shieldTimeLeft > 0 ? hudY + 150 : hudY + 132;
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = lazerBeamActive ? "#7df5ff" : "#9cb8ff";
        ctx.strokeStyle = "rgba(0, 20, 35, 0.85)";
        ctx.strokeText(`LAZER ${lazerPercent}%`, 24, lazerY);
        ctx.fillText(`LAZER ${lazerPercent}%`, 24, lazerY);
    }
    ctx.restore();
}
// =======================
// TENSION SYSTEM - CORE
// =======================

let isFiring = false;
let chargeStart = 0;
let isCharging = false;
let tension = 0;        // 0 → 100
const TENSION_MAX = 100;
let energy = 100;
let maxEnergy = 100;
let energyRegenRate = 18; // énergie par seconde
let lastFrameTime = null;
let impacts = [];
const boost = {
    active: false,
    t: 0,
    duration: 35,   // frames (~0.6s)
    startY: 0
};
let levelFlash = 0;
let comboCount = 0;
let comboPeak = 0;
let comboTimer = 0;
const COMBO_WINDOW = 2.4;
let comboPopupTimer = 0;
let pickupMessage = "";
let pickupMessageTimer = 0;
let shieldTimeLeft = 0;
let lazerBeamActive = false;
const LAZER_BEAM_WIDTH = 16;
const LAZER_BEAM_DPS = 14;
const LAZER_BEAM_ENERGY_PER_SEC = 10;
const LAZER_CHARGE_MAX = 100;
const LAZER_CHARGE_DRAIN_PER_SEC = 32;
const LAZER_CHARGE_REGEN_PER_SEC = 18;
let lazerCharge = LAZER_CHARGE_MAX;
const activeBuff = {
    type: null,
    timeLeft: 0
};

function getComboMultiplier() {
    return 1 + Math.min(1, comboCount * 0.08);
}

function registerKillCombo() {
    comboCount += 1;
    comboTimer = COMBO_WINDOW;
    comboPopupTimer = 0.7;
    if (comboCount > comboPeak) {
        comboPeak = comboCount;
    }
}

function updateCombo(deltaTime) {
    if (comboTimer > 0) {
        comboTimer -= deltaTime;
        if (comboTimer <= 0) {
            comboTimer = 0;
            comboCount = 0;
        }
    }
    if (comboPopupTimer > 0) {
        comboPopupTimer -= deltaTime;
    }
}

function showPickupMessage(text) {
    pickupMessage = text;
    pickupMessageTimer = 1.4;
}

function setBuff(type, duration = 6) {
    activeBuff.type = type;
    activeBuff.timeLeft = duration;
}

function updateBuff(deltaTime) {
    if (activeBuff.timeLeft > 0) {
        activeBuff.timeLeft -= deltaTime;
        if (activeBuff.timeLeft <= 0) {
            activeBuff.timeLeft = 0;
            activeBuff.type = null;
        }
    }

    if (pickupMessageTimer > 0) {
        pickupMessageTimer -= deltaTime;
        if (pickupMessageTimer <= 0) {
            pickupMessage = "";
            pickupMessageTimer = 0;
        }
    }

    if (shieldTimeLeft > 0) {
        shieldTimeLeft -= deltaTime;
        if (shieldTimeLeft < 0) shieldTimeLeft = 0;
    }
}

function getCurrentShootCooldown() {
    if (activeBuff.type === "overdrive") {
        return moduleCooldown * 0.78;
    }
    return moduleCooldown;
}

function getCurrentEnergyRegenMultiplier() {
    return activeBuff.type === "overdrive" ? 1.45 : 1;
}

function maybeDropCollectible(enemy) {
    if (!enemy || enemy.type === "boss") {
        if (enemy) {
            state.collectibles.push({
                x: enemy.x,
                y: enemy.y,
                type: "overdrive",
                life: 10,
                pulse: Math.random() * Math.PI * 2,
                spin: Math.random() * Math.PI * 2,
                size: 10 + Math.random() * 2
            });
            state.collectibles.push({
                x: enemy.x + 22,
                y: enemy.y - 6,
                type: "life",
                life: 11,
                pulse: Math.random() * Math.PI * 2,
                spin: Math.random() * Math.PI * 2,
                size: 10 + Math.random() * 2
            });
        }
        return;
    }

    if (Math.random() > 0.14) return;

    const roll = Math.random();
    const type = roll < 0.58 ? "energy" : (roll < 0.85 ? "shield" : "overdrive");

    state.collectibles.push({
        x: enemy.x,
        y: enemy.y,
        type,
        life: 8,
        pulse: Math.random() * Math.PI * 2,
        spin: Math.random() * Math.PI * 2,
        size: 8 + Math.random() * 2
    });
}

function updateCollectibles(deltaTime) {
    for (let i = state.collectibles.length - 1; i >= 0; i--) {
        const c = state.collectibles[i];
        c.y += 28 * deltaTime;
        c.life -= deltaTime;
        c.pulse += deltaTime * 5;
        c.spin = (c.spin || 0) + deltaTime * 3;
        c.x += Math.sin(c.pulse * 0.55) * 18 * deltaTime;

        const toPlayerX = player.x - c.x;
        const toPlayerY = player.y - c.y;
        const distToPlayer = Math.hypot(toPlayerX, toPlayerY);
        const magnetRange = isMobileDevice ? 180 : 145;
        if (distToPlayer < magnetRange && distToPlayer > 0.001) {
            const strength = 1 - (distToPlayer / magnetRange);
            const pull = (isMobileDevice ? 220 : 180) * (0.35 + strength);
            c.x += (toPlayerX / distToPlayer) * pull * deltaTime;
            c.y += (toPlayerY / distToPlayer) * pull * deltaTime;
        }

        if (c.life <= 0 || c.y > canvas.height + 30) {
            state.collectibles.splice(i, 1);
        }
    }
}

function collectPickups() {
    for (let i = state.collectibles.length - 1; i >= 0; i--) {
        const c = state.collectibles[i];
        const dx = c.x - player.x;
        const dy = c.y - player.y;
        const dist = Math.hypot(dx, dy);
        const pickupRadius = Math.min(player.width, player.height) * (isMobileDevice ? 0.78 : 0.65);

        if (dist > pickupRadius) continue;

        if (c.type === "energy") {
                energy = Math.min(maxEnergy, energy + 32);
            showPickupMessage("+énergie");
        } else if (c.type === "life") {
            ui.lives += 1;
            showPickupMessage("+1 vie");
            playLifePickupSound();
        } else if (c.type === "shield") {
            shieldTimeLeft = Math.min(10, shieldTimeLeft + 6);
            runMetrics.shieldUsed += 1;
            showPickupMessage("+bouclier temporaire");
            playShieldPickupSound();
        } else if (c.type === "overdrive") {
            setBuff("overdrive", 6);
            showPickupMessage("OVERDRIVE activé");
        }

        state.collectibles.splice(i, 1);
    }
}

function triggerLevelFlash(){
    levelFlash = 30;
}

function triggerHyperBoost(){
    boost.active = true;
    boost.t = 0;
    boost.startY = player.y;
}

// ...existing code...
function getShipSize(){
    const base = Math.min(canvas.width, canvas.height);
    const mobileScale = isMobileDevice
        ? (canvas.width < 600 ? 1.55 : 1.35)
        : 1;
    return {
        width: base * 0.09 * mobileScale,
        height: base * 0.13 * mobileScale
    };
}
// ============================
const shipImg = new Image();
const equippedShipAssetId = normalizeShipId(profile?.equippedShip) || "vaisseau1";
shipImg.onerror = () => {
    shipImg.onerror = null;
    shipImg.src = "assets/vaisseau/vaisseau1.png";
};
shipImg.src = `assets/vaisseau/${equippedShipAssetId}.png`;
const enemyImg = new Image();
enemyImg.src = "assets/vaisseau/ennemi/ennemi1.png";
const bossImg = new Image();
bossImg.src = "assets/vaisseau/boss/spectra.png";
const enemyExplosionSound = new Audio("assets/sounds/explosion1.wav");
enemyExplosionSound.volume = 0.4 * sfxVolumeMultiplier;

function playExplosion(){
    if (sfxVolumeMultiplier <= 0) return;
    const s = enemyExplosionSound.cloneNode();
    s.volume = 0.4 * sfxVolumeMultiplier;
    s.play();
}
let wave = 1;
let world = 1;
let worldAnnouncementTimer = 0;
let enemiesToSpawn = 5;
let enemiesSpawned = 0;
let damageCooldown = 0;

// NOCTURNE VELOCITY - CORE V1
// ============================

// ===== CANVAS =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Bouton retour vers le menu ---
function createBackButton(){
    const isMobileLayout = isMobileDevice;
    const buttonSize = isMobileLayout ? 54 : 64;
    const iconSize = isMobileLayout ? 40 : 48;
    const btn = document.createElement("div");
    btn.id = "backBtn";
    btn.innerHTML = `<svg viewBox='0 0 48 48' width='${iconSize}' height='${iconSize}'><circle cx='24' cy='24' r='22' fill='rgba(0,255,255,0.95)'/><path d='M28 16l-8 8 8 8' stroke='#fff' stroke-width='4' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
    btn.style.position = "fixed";
    btn.style.bottom = isMobileLayout
        ? "calc(12px + env(safe-area-inset-bottom, 0px))"
        : "32px";
    btn.style.left = isMobileLayout
        ? "12px"
        : "32px";
    btn.style.width = `${buttonSize}px`;
    btn.style.height = `${buttonSize}px`;
    btn.style.borderRadius = "50%";
    btn.style.boxShadow = "0 0 30px rgba(0,255,255,0.7), 0 0 60px rgba(0,200,255,0.5)";
    btn.style.background = "radial-gradient(circle at 40% 40%, rgba(0,255,255,0.95), rgba(0,180,255,0.6), rgba(0,20,40,0.8))";
    btn.style.zIndex = "100";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.transition = "transform 0.15s, box-shadow 0.15s";
    btn.addEventListener("touchstart", ()=>btn.style.transform="scale(0.93)");
    btn.addEventListener("touchend", ()=>btn.style.transform="scale(1)");
    btn.addEventListener("mousedown", ()=>btn.style.transform="scale(0.93)");
    btn.addEventListener("mouseup", ()=>btn.style.transform="scale(1)");
    btn.addEventListener("click", ()=>{
        commitRunStats();
        if (profile) {
            profile.hardcoreMode = false;
            savePlayerProfile();
        }
        document.body.style.transition="0.8s";
        document.body.style.opacity="0";
        setTimeout(()=>{ window.location.href = "menu.html"; },800);
    });
    document.body.appendChild(btn);
}
window.addEventListener("load", createBackButton);

// --- NÉBULEUSE MAGIQUE ---
function drawNebula(){
    let color1, color2;

    switch(world){
        case 1:
            color1 = "rgba(0,120,200,0.05)";
            color2 = "rgba(0,255,255,0.03)";
            break;

        case 2:
            color1 = "rgba(120,0,180,0.07)";
            color2 = "rgba(180,80,255,0.04)";
            break;

        case 3:
            color1 = "rgba(60,0,120,0.08)";
            color2 = "rgba(255,0,120,0.04)";
            break;

        default:
            color1 = "rgba(10,10,40,0.1)";
            color2 = "rgba(120,120,255,0.05)";
    }

    const gradient = ctx.createRadialGradient(
        canvas.width * 0.7,
        canvas.height * 0.3,
        0,
        canvas.width * 0.7,
        canvas.height * 0.3,
        canvas.height * 0.8
    );
    gradient.addColorStop(0, color1);
    gradient.addColorStop(0.5, color2);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);
}

// --- PLAN FOND : Planètes, Météorites, Étoiles ---
let planets = [];
let meteors = [];

function initPlanets(){
    planets = [];
    for(let i=0;i<3;i++){
        planets.push({
            x: Math.random()*canvas.width,
            y: Math.random()*canvas.height,
            r: 40 + Math.random()*60,
            speed: 0.2 + Math.random()*0.3
        });
    }
}
function updatePlanets(){
    planets.forEach(p=>{
        p.y += p.speed;
        if(p.y - p.r > canvas.height){
            p.y = -p.r;
            p.x = Math.random()*canvas.width;
        }
    });
}
function drawPlanets(){
    planets.forEach(p=>{
        const gradient = ctx.createRadialGradient(
            p.x, p.y, 0,
            p.x, p.y, p.r
        );
        gradient.addColorStop(0, "rgba(20,120,180,0.5)");
        gradient.addColorStop(1, "rgba(10,0,40,0.2)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
    });
}

function spawnMeteor(){
    meteors.push({
        x: Math.random()*canvas.width,
        y: -20,
        size: 2 + Math.random()*4,
        speed: 4 + Math.random()*3,
        angle: Math.random()*0.5 - 0.25
    });
}
function updateMeteors(){
    for(let i = meteors.length-1; i>=0; i--){
        const m = meteors[i];
        m.y += m.speed;
        m.x += m.angle * 2;
        if(m.y > canvas.height+20){
            meteors.splice(i,1);
        }
    }
}
function drawMeteors(){
    meteors.forEach(m=>{
        ctx.fillStyle = "rgba(200,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI*2);
        ctx.fill();
    });
}



// ============================
// PLAYER
// ============================
const player = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    invincible: false,
    invincibleTimer: 0
};

function resizeCanvas(){
    canvas.width = Math.floor(window.innerWidth);
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    canvas.height = Math.floor(viewportHeight);
    resetPlayerPosition();
    initPlanets();
    meteors = [];
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
}
// ============================
// CONTRÔLE SOURIS
// ============================
let mouseTarget = { x: null, y: null };

canvas.addEventListener("mousemove", function(e) {
    setTargetFromClient(e.clientX, e.clientY, false);
});

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ============================
// CONFIG
// ============================
const config = {
    playerSpeed: 5,
    droneRadius: 80,
    droneSpeed: 0.02,
    enemySpawnRate: 1000
};

const MovementTypes = {
    VERTICAL: "vertical",
    HORIZONTAL: "horizontal",
    CURVE: "curve",
    ARC_DIVE: "arc_dive",
    ORBIT: "orbit",
    FEINT: "feint"
};

function getMovementForWorld(){

    if(world === 1){
        return MovementTypes.VERTICAL;
    }

    if(world === 2){
        const roll = Math.random();

        if(roll < 0.5) return MovementTypes.VERTICAL;
        if(roll < 0.8) return MovementTypes.HORIZONTAL;
        return MovementTypes.CURVE;
    }

    if(world >= 3){

        const roll = Math.random();

        if(roll < 0.24) return MovementTypes.VERTICAL;
        if(roll < 0.43) return MovementTypes.HORIZONTAL;
        if(roll < 0.62) return MovementTypes.CURVE;
        if(roll < 0.8) return MovementTypes.ARC_DIVE;
        if(roll < 0.91) return MovementTypes.ORBIT;
        return MovementTypes.FEINT;
    }

    return MovementTypes.VERTICAL;
}

const modules = sanitizeModuleCatalog(profile?.moduleCatalog);

const activeModuleId = profile ? profile.equippedModule : null;
const moduleData = activeModuleId && modules[activeModuleId] ? modules[activeModuleId] : null;

let moduleCooldown = moduleData ? moduleData.cooldown : 500;
let energyCost = moduleData ? moduleData.energyCost : 10;
let moduleDamage = moduleData ? moduleData.damage : 1;

const alphaDrone = profile?.drones?.alpha;
let dronePower = alphaDrone?.unlocked ? alphaDrone.level : 0;
const garageUnlocks = profile?.garageUnlocks || createDefaultGarageUnlocks();
const hasDroneOverclock = Boolean(garageUnlocks.droneOverclock);
const hasHaloCosmique = Boolean(garageUnlocks.haloCosmique);
const isHardcoreMode = Boolean(profile?.hardcoreMode);
let intensity = 1;
let intensityBase = 1;
let intensityGrowthDivisor = 60;
let gameTime = 0;
let enemySpawnRate = 2000;
let intensityTier = 1;
let enemySpeedMultiplier = 1;
let enemyFireRateMultiplier = 1;
let lazerRechargeMultiplier = 1;

function getKillsTargetForLevel(level) {
    const levelValue = Math.max(1, Math.floor(level));
    if (isHardcoreMode) {
        return 5 + Math.floor(levelValue * 2);
    }
    if (levelValue <= 8) {
        return 5 + Math.floor(levelValue * 2);
    }
    return 21 + Math.floor((levelValue - 8) * 1.2);
}

function flashIntensity() {
    flashFilterBoostActive = true;
    applyCanvasVisualFilter();
    setTimeout(() => {
        flashFilterBoostActive = false;
        applyCanvasVisualFilter();
    }, 200);
}

function updateDifficulty(deltaTime) {

    gameTime += deltaTime;
    intensity = intensityBase + (gameTime / intensityGrowthDivisor);
    if (intensity > maxIntensityReached) {
        maxIntensityReached = intensity;
    }
    const spawnFloor = (isMobileDevice && !isHardcoreMode) ? 560 : 400;
    enemySpawnRate = Math.max(spawnFloor, 2000 / intensity);

    const currentTier = Math.floor(intensity);
    if (currentTier > intensityTier) {
        intensityTier = currentTier;
        flashIntensity();
        playIntensityPulse();
    }

    updateIntensityHUD();
}

// Appeler checkOrientation seulement après l'init de ui
setTimeout(checkOrientation, 0);
// STATE
// ============================

const state = {
  keys: {},
  bullets: [],
  enemies: [],
  drones: [],
    collectibles: [],
  stars: [],
  enemyBullets: [],
  lastFire: 0,
  lastEnemySpawn: 0,
  bossActive: false,
  killsThisWave: 0,
    killsTarget: getKillsTargetForLevel(1)
};

function initStars(count = 120){
    state.stars = [];
    for(let i = 0; i < count; i++){
        state.stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: 0.5 + Math.random() * 2
        });
    }
}

initStars();

function updateStars(){
    const velocityBoost = Math.min(ui.level * 0.4, 8);
    const warp = boost.active ? 10 : 0;

    state.stars.forEach(star=>{
        star.y += star.speed + velocityBoost + warp;

        if(star.y > canvas.height){
            star.y = -5;
            star.x = Math.random() * canvas.width;
        }
    });
}

function drawStars(){
    state.stars.forEach(star=>{

        const speedFactor = star.speed + ui.level * 0.3;

        ctx.globalAlpha = 0.2 + star.size * 0.4;

        // traînée
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(star.x, star.y, star.size, star.size + speedFactor * 2);

    });

    ctx.globalAlpha = 1;
}

// SYSTÈME DE TENSION GLOBAL
function updateTension(){
    // pression = nombre d’ennemis + tirs ennemis
    tension += state.enemies.length * 0.03;
    tension += state.enemyBullets.length * 0.01;
    // détente lente (si tu veux, plus doux)
    tension -= 0.05;
    // clamp propre
    if(tension < 0) tension = 0;
    if(tension > TENSION_MAX) tension = TENSION_MAX;
}

const ui = {
    score: 0,
    lives: hasHaloCosmique ? 4 : 3,
    level: 1,
    gameOver: false
};



function resetPlayerPosition(){
    const marginBottom = canvas.height * 0.18;
    player.x = canvas.width / 2;
    player.y = canvas.height - marginBottom;
}

resetPlayerPosition();

// ============================
// INIT DRONES
// ============================
function initDrones(power = 0){
    state.drones = [];

    if(power <= 0) return;

    const level = Math.max(1, Math.floor(power));
    const cooldownByLevel = {
        1: 800,
        2: 600,
        3: 450,
        4: 320,
        5: 220,
        6: 150
    };
    const shootCooldown = cooldownByLevel[level] || cooldownByLevel[6];
    const finalShootCooldown = hasDroneOverclock ? Math.max(120, shootCooldown * 0.85) : shootCooldown;

    const droneCount = Math.max(2, power);

    for(let i = 0; i < droneCount; i++){
        state.drones.push({
            angle: (Math.PI * 2 / droneCount) * i,
            orbitRadius: 60 + power * 5,
            shootCooldown: finalShootCooldown,
            lastShot: 0,
            prevX: player.x,
            prevY: player.y
        });
    }
}
            
initDrones(dronePower);

// ============================
// INPUT
// ============================
let fireMode = isMobileDevice
    ? (autoFireTouchEnabled ? "autoTouch" : "manualButton")
    : "holdAnywhere";
let activeTouchId = null;

function getMobileTouchOffsetY() {
    if (!isMobileDevice) return 0;
    const shipSize = getShipSize();
    const basedOnShip = shipSize.height * 1.05;
    const basedOnScreen = canvas.height * 0.07;
    return Math.max(68, Math.min(112, Math.max(basedOnShip, basedOnScreen)));
}

function setTargetFromClient(clientX, clientY, useMobileOffset = false) {
        const rect = canvas.getBoundingClientRect();
    const offsetY = useMobileOffset ? getMobileTouchOffsetY() : 0;
        mouseTarget.x = Math.max(0, Math.min(canvas.width, clientX - rect.left));
        mouseTarget.y = Math.max(0, Math.min(canvas.height, clientY - rect.top - offsetY));
}

function updateTouchTarget(touchEvent) {
    const touchList = touchEvent.touches || touchEvent.changedTouches;
    if (!touchList || touchList.length === 0) return;

    let touch = null;
    if (activeTouchId !== null) {
        touch = Array.from(touchList).find((entry) => entry.identifier === activeTouchId) || null;
    }
    if (!touch) {
        touch = touchList[0];
    }
    if (!touch) return;
    setTargetFromClient(touch.clientX, touch.clientY, true);
}

function startFire(){
  isFiring = true;
  isCharging = true;
  chargeStart = performance.now();
}

function stopFire(){
  isFiring = false;
  if(isCharging){
    const chargeTime = performance.now() - chargeStart;
    if(chargeTime > 1000){
      // futur: tir spécial
      // triggerSpecialShot();
    }
  }
  isCharging = false;
}

// PC : tir si holdAnywhere (clic maintenu)
window.addEventListener("mousedown", () => {
  if(fireMode === "holdAnywhere") startFire();
});
window.addEventListener("mouseup", () => {
  if(fireMode === "holdAnywhere") stopFire();
});

// Mobile : tir auto au toucher du canvas si autoTouch
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const firstTouch = e.changedTouches && e.changedTouches[0];
    if (firstTouch) {
        activeTouchId = firstTouch.identifier;
    }
    updateTouchTarget(e);
    if(fireMode === "autoTouch") startFire();
}, { passive: false });

window.addEventListener("touchmove", (e) => {
    if (activeTouchId === null) return;
    e.preventDefault();
    updateTouchTarget(e);
}, { passive: false });

window.addEventListener("touchend", (e) => {
    if (activeTouchId === null) return;
    e.preventDefault();
    const remainingTouches = e.touches || [];
    if (remainingTouches.length > 0) {
        activeTouchId = remainingTouches[0].identifier;
        updateTouchTarget(e);
        return;
    }

    activeTouchId = null;
    mouseTarget.x = null;
    mouseTarget.y = null;
    if (fireMode === "autoTouch") stopFire();
}, { passive: false });

window.addEventListener("touchcancel", (e) => {
    if (activeTouchId === null) return;
    e.preventDefault();
    activeTouchId = null;
    mouseTarget.x = null;
    mouseTarget.y = null;
    if(fireMode === "autoTouch") stopFire();
}, { passive: false });

if (window.PointerEvent && !("ontouchstart" in window)) {
    canvas.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
        setTargetFromClient(e.clientX, e.clientY, true);
        if (fireMode === "autoTouch") startFire();
    });

    canvas.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
        setTargetFromClient(e.clientX, e.clientY, true);
    });

    window.addEventListener("pointerup", (e) => {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
        mouseTarget.x = null;
        mouseTarget.y = null;
        if (fireMode === "autoTouch") stopFire();
    });

    window.addEventListener("pointercancel", (e) => {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
        mouseTarget.x = null;
        mouseTarget.y = null;
        if (fireMode === "autoTouch") stopFire();
    });
}

// Bouton tir si manualButton
const shootBtn = document.getElementById("shootBtn");
if(shootBtn){
    shootBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
    if(fireMode === "manualButton") startFire();
    }, { passive: false });
    shootBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
    if(fireMode === "manualButton") stopFire();
    }, { passive: false });
    shootBtn.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        if(fireMode === "manualButton") stopFire();
    }, { passive: false });
}
// ============================
// UPDATE PLAYER
// ============================
function updatePlayer(){
    if(boost.active){
        // Active l'invincibilité pendant le boost
        player.invincible = true;
        player.invincibleTimer = boost.duration - boost.t;
        boost.t++;
        const p = boost.t / boost.duration;
        const ease = 1 - Math.pow(1 - p, 3);
        const targetY = canvas.height * 0.22;
        player.y = boost.startY + (targetY - boost.startY) * ease;
        player.x += (canvas.width/2 - player.x) * 0.08;
        if(boost.t >= boost.duration){
            boost.active = false;
            resetPlayerPosition();
            player.invincible = false;
            player.invincibleTimer = 0;
        }
        return;
    }
    // Timer d'invincibilité
    if(player.invincibleTimer > 0){
        player.invincibleTimer--;
        if(player.invincibleTimer <= 0){
            player.invincible = false;
        }
    }

    // Contrôle clavier
    if(state.keys["ArrowLeft"])  player.x -= config.playerSpeed;
    if(state.keys["ArrowRight"]) player.x += config.playerSpeed;
    if(state.keys["ArrowUp"])    player.y -= config.playerSpeed * 0.5;
    if(state.keys["ArrowDown"])  player.y += config.playerSpeed * 0.5;

    // Contrôle souris fluide
    if (mouseTarget.x !== null && mouseTarget.y !== null) {
        player.x = lerp(player.x, mouseTarget.x, 0.15);
        player.y = lerp(player.y, mouseTarget.y, 0.15);
    }

    // limites adaptatives
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
}

// ============================
// UPDATE DRONES
// ============================
function updateDrones(timestamp){
    state.drones.forEach(d => {

        d.prevX = d.x ?? player.x;
        d.prevY = d.y ?? player.y;

        d.angle += config.droneSpeed;

        d.x = player.x + Math.cos(d.angle) * d.orbitRadius;
        d.y = player.y + Math.sin(d.angle) * d.orbitRadius;

        if(timestamp - d.lastShot > d.shootCooldown){

            const createDroneBullet = (offsetX = 0) => ({
                x: d.x + offsetX,
                y: d.y,
                width: 4,
                height: 14,
                vx: 0,
                vy: -8,
                damage: 1,
                type: "drone"
            });

            if (dronePower >= 5) {
                state.bullets.push(createDroneBullet(-4));
                state.bullets.push(createDroneBullet(4));
            } else {
                state.bullets.push(createDroneBullet());
            }

            d.lastShot = timestamp;
        }
    });
}


// ============================
// UPDATE BULLETS
// ============================
function updateBullets(){
    state.bullets.forEach(b=>{

        b.x += b.vx;
        b.y += b.vy;
    });

    state.bullets = state.bullets.filter(b =>
        b.y > -20 && b.y < canvas.height + 20 &&
        b.x > -20 && b.x < canvas.width + 20
    );
}
// ============================
// FIRE SYSTEM
// ============================
function shoot(timestamp){
    if (activeModuleId === "lazer") {
        const canActivateBeam = energy > 0 && lazerCharge > 2;
        if (canActivateBeam && !lazerBeamActive) {
            runMetrics.laserUsed += 1;
        }

        if (canActivateBeam) {
            lazerBeamActive = true;
            state.lastFire = timestamp;
        } else {
            lazerBeamActive = false;
        }
        return;
    }

    lazerBeamActive = false;

    if(timestamp - state.lastFire < getCurrentShootCooldown()) return;

    if (energy < energyCost) return;

    energy -= energyCost;

    state.lastFire = timestamp;

    const hud = document.getElementById("moduleHUD");
    if (hud) {
        hud.style.opacity = "1";

        setTimeout(() => {
            hud.style.opacity = "0.85";
        }, 150);
    }
    const bulletSpeed = activeModuleId === "flux" || activeModuleId === "lazer" ? 15 : 10;
    state.bullets.push({
        x: player.x,
        y: player.y,
        width: (activeModuleId === "impact" || activeModuleId === "nova") ? 12 : 4,
        height: 22,
        speed: bulletSpeed,
        vx: 0,
        vy: -bulletSpeed,
        damage: moduleData ? moduleData.damage : 1,
        type: activeModuleId || "normal"
    });
    runMetrics.shotsFired += 1;

    playShootSound();
}

function applySlow(enemy) {
    enemy.slowTimer = 0.3;
}

function updateImpacts() {

    impacts.forEach(i => {
        i.radius += 1.5;
        i.alpha -= 0.05;
    });

    impacts = impacts.filter(i => i.alpha > 0);
}

function rewardCredits(amount) {
    if (!profile) return;
    profile.credits += amount;
    saveProfile();
    updateCreditsHUD();
}

function rewardScoreForKill() {
    const base = Math.max(1, Math.floor(intensity));
    const bonus = Math.floor(base * getComboMultiplier());
    ui.score += bonus;
    registerKillCombo();
}

function handleBossProgression() {
    if (!profile) return;

    if (world >= 4) {
        profile.world4Completed = true;
    }

    updateRunWorldReached(world + 1);

    refreshHardcoreUnlockState(true);
    savePlayerProfile();
}



    

// ============================
function createEnemy(type, x, y, options = {}) {
    const enemyBaseSize = canvas.width < 600 ? 58 : 45;
    const baseEnemySpeed = type === "boss"
        ? (1.5 + Math.floor(ui.level / 5) * 0.3)
        : (2 + ui.level * 0.3);
    const intensitySpeedSlope = (isMobileDevice && !isHardcoreMode) ? 0.38 : 0.55;
    const intensitySpeedFactor = 1 + Math.max(0, intensity - 1) * intensitySpeedSlope;
    const mobileFactor = isMobileDevice ? 0.88 : 1;
    const tunedSpeed = baseEnemySpeed * intensitySpeedFactor * enemySpeedMultiplier * mobileFactor;

    let color;
    switch(type) {
        case "normal":
            color = "#ff3b3b";
            break;
        case "zigzag":
            color = "#ff6a00";
            break;
        case "shooter":
            color = "#ff2a6d";
            break;
        case "boss":
            color = "rgba(140,0,255,0.7)";
            break;
    }
    const enemy = {
        x,
        y,
        size: type === "boss" ? 140 : enemyBaseSize,
        type,
        color,
        // Boss : difficulté évolutive tous les 5 niveaux
        hp: type === "boss"
            ? (40 + Math.floor(ui.level / 5) * 15)
            : 1 + Math.floor(intensity / 2),
        speed: tunedSpeed,
        baseSpeed: tunedSpeed,
        movementType: options.movementType || getMovementForWorld(),
        formation: options.formation || null,
        groupId: options.groupId || null,
        index: options.index || 0,
        isLeader: options.isLeader === true,
        baseX: x,
        baseY: y,
        spawnTime: performance.now(),
        timeAlive: 0,
        phase: type === "boss" ? Math.random() * Math.PI * 2 : undefined,
        slowTimer: 0
    };
    // FX / Animations (léger et modulable)
    enemy.enginePhase = Math.random() * Math.PI * 2; // moteur flicker
    enemy.hitTimer = 0;                               // frames de flash
    enemy.hitShake = 2;                               // px max
    enemy.pulsePhase = Math.random() * Math.PI * 2;   // boss pulse
    state.enemies.push(enemy);
}

function spawnFormation(type, count, enemyType = "normal") {
    const minX = 70;
    const maxX = Math.max(minX + 1, canvas.width - 70);
    const baseX = minX + Math.random() * (maxX - minX);
    const groupId = Date.now() + Math.random();

    for(let i = 0; i < count; i++){
        createEnemy(enemyType, baseX, -80 - (i * 40), {
            formation: type,
            groupId,
            index: i,
            isLeader: i === 0,
            movementType: MovementTypes.VERTICAL
        });
    }
}

function spawnEnemy(timestamp){
    if(timestamp - state.lastEnemySpawn < enemySpawnRate) return;

  // tant que le joueur n'a pas fait ses kills de vague, on continue
  if(state.killsThisWave >= state.killsTarget) return;

  // garde-fou anti écran rempli
    const capBase = 8 + Math.floor(ui.level * 0.6);
        const cap = isMobileDevice ? Math.max(6, Math.floor(capBase * 0.82)) : capBase;
    const activeNonBossEnemies = state.enemies.filter(e=>e.type!=="boss").length;
    if(activeNonBossEnemies >= cap) return;

  state.lastEnemySpawn = timestamp;
    const availableSlots = Math.max(1, cap - activeNonBossEnemies);
    const formationCount = Math.min(5, availableSlots);

    if(world === 1){
        const enemyType = Math.random() < 0.2 ? "shooter" : "normal";
        spawnFormation("vertical", formationCount, enemyType);
        return;
    }

    if(world === 2){
        const formationType = Math.random() < 0.55 ? "vertical" : "vshape";
        const typeRoll = Math.random();
        const enemyType = typeRoll < 0.6 ? "normal" : (typeRoll < 0.85 ? "zigzag" : "shooter");
        spawnFormation(formationType, formationCount, enemyType);
        return;
    }

    if(world >= 3){
        const useSerpent = Math.random() < 0.6;
        if(useSerpent){
            const enemyTypeRoll = Math.random();
            const enemyType = enemyTypeRoll < 0.5 ? "zigzag" : (enemyTypeRoll < 0.78 ? "normal" : "shooter");
            spawnFormation("serpent", formationCount, enemyType);
        } else {
            const spawnX = 70 + Math.random() * (canvas.width - 140);
            const arcType = Math.random() < 0.5 ? "zigzag" : "shooter";
            createEnemy(arcType, spawnX, -50, { movementType: MovementTypes.ARC_DIVE });
        }
        return;
    }

    const spawnX = 50 + Math.random() * (canvas.width - 100);
    createEnemy("normal", spawnX, -50);
}

function updateEnemies(deltaTime){
    const leadersByGroup = new Map();
    for (const enemy of state.enemies) {
        if (enemy.formation && enemy.isLeader) {
            leadersByGroup.set(enemy.groupId, enemy);
        }
    }

  for(let i = state.enemies.length - 1; i >= 0; i--){
    const e = state.enemies[i];
        const prevX = e.x;
    const timeAlive = (e.timeAlive || 0) + deltaTime;
    e.timeAlive = timeAlive;

    if (e.hitTimer > 0) e.hitTimer--;
    e.enginePhase += 0.08 * deltaTime * 60;

        // --- Boss ---
        if(e.type === "boss"){
            const targetY = canvas.height * 0.18;
            e.y += (targetY - e.y) * Math.min(1, deltaTime * 3);
            e.x = e.baseX + Math.sin(timeAlive * 2 + (e.phase||0)) * 30;

            // Boss tire vers le joueur
            if (e.bossShotTimer === undefined) e.bossShotTimer = 0;
            e.bossShotTimer += deltaTime;
            const bossFireRate = ((900 - Math.min(ui.level * 30, 600)) / enemyFireRateMultiplier) / 1000;
            if (e.bossShotTimer > bossFireRate) {
                e.bossShotTimer = 0;
                // Calcul direction vers le joueur
                const dx = player.x - e.x;
                const dy = player.y - e.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const speed = 5 + Math.floor(ui.level/5); // vitesse évolutive
                const vx = dx / dist * speed;
                const vy = dy / dist * speed;
                state.enemyBullets.push({
                    x: e.x,
                    y: e.y + e.size/2,
                    vx,
                    vy,
                    r: 12,
                    color: "#ff00ff"
                });
            }
            continue; // jamais despawn ici
        }

        // --- ennemis normaux ---
        e.speed = e.baseSpeed;
        if (e.slowTimer > 0) {
            e.speed *= 0.5;
            e.slowTimer -= deltaTime;
            if (e.slowTimer < 0) e.slowTimer = 0;
        }
        const tensionSpeedBoost = isMobileDevice
            ? (isHardcoreMode ? 0.0045 : 0.0032)
            : 0.006;
        e.speed += (tension * tensionSpeedBoost);

        let handledByFormation = false;
        const leader = e.isLeader ? e : leadersByGroup.get(e.groupId);

        if(e.formation === "vertical"){
            if (e.isLeader || !leader) {
                e.y += e.speed * deltaTime * 100;
            } else {
                e.x = leader.x;
                e.y = leader.y + (e.index * 34);
            }
            handledByFormation = true;
        }

        if(e.formation === "vshape"){
            const spread = 40;

            if(e.isLeader || !leader){
                e.y += e.speed * deltaTime * 100;
            } else {
                const side = e.index % 2 === 0 ? -1 : 1;
                const level = Math.ceil(e.index / 2);
                e.x = leader.x + side * spread * level;
                e.y = leader.y + level * 30;
            }
            handledByFormation = true;
        }

        if(e.formation === "serpent"){
            e.y += e.speed * deltaTime * 100;
            const baseX = leader ? leader.x : e.baseX;
            const wave = Math.sin(e.timeAlive * 3 + e.index) * 40;
            e.x = baseX + wave;
            handledByFormation = true;
        }

        if(!handledByFormation){
            let targetX = e.x;
            let steering = 4.5;

            switch(e.movementType){

            case MovementTypes.VERTICAL:
                e.y += e.speed * deltaTime * 100;
                targetX = e.baseX + Math.sin(timeAlive * 0.9 + (e.phase || 0)) * 10;
                steering = 3.2;
                break;

            case MovementTypes.HORIZONTAL:
                if(e.strafeAmplitude === undefined){
                    e.strafeAmplitude = 58 + Math.random() * 34;
                    e.strafeFreq = 2.2 + Math.random() * 1.2;
                }
                e.y += e.speed * 0.7 * deltaTime * 100;
                targetX = e.baseX + Math.sin(timeAlive * e.strafeFreq) * e.strafeAmplitude;
                steering = 5.2;
                break;

            case MovementTypes.CURVE:
                e.y += e.speed * 0.8 * deltaTime * 100;
                targetX = e.baseX
                    + Math.sin(timeAlive * 1.9 + (e.phase || 0)) * 58
                    + Math.sin(timeAlive * 0.9) * 14;
                steering = 4.3;
                break;

            case MovementTypes.ARC_DIVE:
                {
                    const enemy = e;

                    if(enemy.phase === undefined){
                        enemy.phase = "arc";
                        enemy.arcDuration = 1.8;
                        enemy.arcAmplitude = 180;
                    }

                    if(enemy.phase === "arc"){

                        enemy.y += enemy.speed * 0.7 * deltaTime * 100;

                        const progress = enemy.timeAlive / enemy.arcDuration;

                        targetX = enemy.baseX + Math.sin(progress * Math.PI) * enemy.arcAmplitude;
                        steering = 6.4;

                        if(enemy.timeAlive >= enemy.arcDuration){
                            enemy.phase = "dive";
                            enemy.diveSpeed = enemy.speed * 1.2;
                        }
                    }
                    else if(enemy.phase === "dive"){

                        enemy.diveSpeed += 0.02;
                        enemy.y += enemy.diveSpeed * deltaTime * 100;
                        targetX = enemy.x + Math.sin(timeAlive * 1.6) * 6;
                        steering = 2.2;
                    }
                }

                break;

            case MovementTypes.ORBIT:
                if(e.orbitRadius === undefined){
                    e.orbitRadius = 42 + Math.random() * 32;
                    e.orbitSpeed = 1.8 + Math.random() * 1.2;
                }
                e.y += e.speed * 0.62 * deltaTime * 100;
                targetX = e.baseX + Math.sin(timeAlive * e.orbitSpeed + (e.phase || 0)) * e.orbitRadius;
                steering = 3.8;
                break;

            case MovementTypes.FEINT:
                if(e.feintDir === undefined){
                    e.feintDir = Math.random() < 0.5 ? -1 : 1;
                    e.feintAmplitude = 28 + Math.random() * 26;
                }
                e.y += e.speed * 0.82 * deltaTime * 100;
                targetX = e.baseX
                    + Math.sin(timeAlive * 5.2) * e.feintAmplitude
                    + Math.sin(timeAlive * 1.6) * e.feintAmplitude * 0.35 * e.feintDir;
                steering = 7.2;
                break;

            default:
                e.y += e.speed * deltaTime * 100;
                targetX = e.baseX;
                steering = 3.5;
                break;
        }

            if (Number.isFinite(targetX)) {
                const blend = Math.min(1, steering * deltaTime);
                e.x += (targetX - e.x) * blend;
            }
        }

    const sideMargin = Math.max(24, (e.size || 45) * 0.45);
    e.x = clamp(e.x, sideMargin, canvas.width - sideMargin);

    const lateralVelocity = (e.x - prevX) / Math.max(0.001, deltaTime);
    const normalizedLateral = clamp(lateralVelocity / 260, -1, 1);
    const maxBank = isMobileDevice ? 0.2 : 0.24;
    const targetBankAngle = normalizedLateral * maxBank;
    const previousBank = e.bankAngle || 0;
    e.bankAngle = previousBank + (targetBankAngle - previousBank) * Math.min(1, deltaTime * 10);

    // s'ils sortent, on les retire (mais ça ne doit PAS valider la vague)
    if(e.y > canvas.height + 60){
      state.enemies.splice(i, 1);
      continue;
    }

        const canFireAsSupport = (world >= 2 && e.type === "zigzag") || (world >= 3 && e.type === "normal");
        if(e.type === "shooter" || canFireAsSupport){
            let baseChance;
            let bulletRadius;
            let bulletVy;

            if (e.type === "shooter") {
                baseChance = 0.016 + ui.level * 0.0024;
                bulletRadius = 7;
                bulletVy = 7.2 + ui.level * 0.35;
            } else if (e.type === "zigzag") {
                baseChance = 0.009 + ui.level * 0.0015;
                bulletRadius = 6;
                bulletVy = 6.4 + ui.level * 0.28;
            } else {
                baseChance = 0.006 + ui.level * 0.0012;
                bulletRadius = 5;
                bulletVy = 5.8 + ui.level * 0.24;
            }

            bulletVy = Math.max(bulletVy, e.speed * 2.2);

            const dyn = (baseChance + tension * 0.00022) * enemyFireRateMultiplier;
            if(Math.random() < dyn * deltaTime * 60){
                state.enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    vx: 0,
                    vy: bulletVy,
                    r: bulletRadius,
                    accelDelay: 0.5,
                    accelRate: isMobileDevice ? 0.09 : 0.12,
                    color: e.type === "shooter" ? "#ff4a8b" : "#ff7aa8"
                });
            }
        }
  }
}

// ============================
// WAVE SYSTEM
// ============================

function isWaveCleared(){
  const bossAlive = state.enemies.some(e => e.type === "boss");
  return (state.killsThisWave >= state.killsTarget) && !bossAlive;
}

function startNextWave(){
  ui.level += 1;

  // prochain objectif : plus tu montes, plus il faut tuer
  state.killsThisWave = 0;
    state.killsTarget = getKillsTargetForLevel(ui.level);

  triggerLevelFlash();
  triggerHyperBoost();

  // boss toutes les 5 vagues
  if(ui.level % 5 === 0 && !state.bossActive){
    createEnemy("boss", canvas.width / 2, -150);
    state.bossActive = true;
  }
}

function updateEnemyBullets(){
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const b = state.enemyBullets[i];
        // guidage uniquement pour Spectra
        if (b.type === "spectra") {
            const dx = player.x - b.x;
            const dy = player.y - b.y;
            const len = Math.hypot(dx, dy) || 1;
            const tx = dx / len;
            const ty = dy / len;
            const vlen = Math.hypot(b.vx, b.vy) || 1;
            let cx = b.vx / vlen;
            let cy = b.vy / vlen;
            cx += (tx - cx) * b.turn;
            cy += (ty - cy) * b.turn;
            const sp = vlen;
            b.vx = cx * sp;
            b.vy = cy * sp;
        }

        if (b.type !== "spectra") {
            if (b.accelDelay === undefined) b.accelDelay = 0.5;
            if (b.accelRate === undefined) b.accelRate = isMobileDevice ? 0.09 : 0.12;

            if (b.accelDelay > 0) {
                b.accelDelay -= 1 / 60;
            } else {
                b.vy += b.accelRate;
            }
        }

        b.x += b.vx;
        b.y += b.vy;
        b.life = (b.life !== undefined) ? b.life - 1 : 9999;
        if (b.life <= 0 || b.y > canvas.height + 40 || b.x < -40 || b.x > canvas.width + 40 || b.y < -40) {
            state.enemyBullets.splice(i, 1);
            continue;
        }
    }
}

function checkCollisions(){
    // ...existing code...
}
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function circleRectCollide(cx, cy, r, rx, ry, rw, rh){
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx*dx + dy*dy) <= r*r;
}

function handleCollisions(){

    // Enemy bullets -> player
    for(let i = state.enemyBullets.length - 1; i >= 0; i--){
        const eb = state.enemyBullets[i];
        const hitboxScale = isMobileDevice ? 0.86 : 1;
        const pw = player.width * hitboxScale;
        const ph = player.height * hitboxScale;

        if(
            eb.x > player.x - pw/2 &&
            eb.x < player.x + pw/2 &&
            eb.y > player.y - ph/2 &&
            eb.y < player.y + ph/2
        ){
            state.enemyBullets.splice(i,1);
            if(damageCooldown === 0){
                if (shieldTimeLeft > 0) {
                    shieldTimeLeft = Math.max(0, shieldTimeLeft - 2.5);
                } else {
                    ui.lives--;
                    runMetrics.damageTaken += 1;
                }
                damageCooldown = 50; // invincibilité prolongée
                if(ui.lives <= 0) ui.gameOver = true;
            }
        }
    }

    if (lazerBeamActive) {
        const beamHalfWidth = LAZER_BEAM_WIDTH * 0.5;
        const beamTopY = -30;

        for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
            const enemy = state.enemies[ei];
            if (enemy.y >= player.y || enemy.y < beamTopY) continue;

            const hitR = (enemy.size || 45) * 0.4;
            const dxBeam = Math.abs(enemy.x - player.x);
            if (dxBeam > (hitR + beamHalfWidth)) continue;

            enemy.hitTimer = 5;
            enemy.hitShake = 2;
            impacts.push({
                x: enemy.x,
                y: enemy.y,
                radius: 4,
                alpha: 0.9
            });

            const lazerDamagePerFrame = (LAZER_BEAM_DPS / 60) * (moduleData ? moduleData.damage : 1);
            enemy.hp -= lazerDamagePerFrame;

            if (enemy.hp <= 0) {
                const isBoss = enemy.type === "boss";
                maybeDropCollectible(enemy);
                state.enemies.splice(ei, 1);

                if (isBoss) {
                    runMetrics.bossesKilled += 1;
                    rewardScoreForKill();
                    rewardCredits(100);
                    state.bossActive = false;
                    handleBossProgression();
                    world++;
                    worldAnnouncementTimer = 180;
                } else {
                    runMetrics.enemiesDestroyed += 1;
                    playExplosion();
                    rewardScoreForKill();
                    rewardCredits(5);
                    state.killsThisWave++;
                }
            }
        }
    }

    // Bullets -> enemies (collision centrée sur le sprite)
    
     for(let bi = state.bullets.length - 1; bi >= 0; bi--){
  const bullet = state.bullets[bi];

  for(let ei = state.enemies.length - 1; ei >= 0; ei--){
    const enemy = state.enemies[ei];

    const dx = bullet.x - enemy.x;
    const dy = bullet.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    const bulletR = bullet.r ?? 4;
    const hitR = (enemy.size || 45) * 0.4;

    if(dist < hitR + bulletR){
      enemy.hitTimer = 6;
      enemy.hitShake = 2;
            impacts.push({
                x: enemy.x,
                y: enemy.y,
                radius: 5,
                alpha: 1
            });
            const baseDamage = bullet.damage ?? 1;
            const damage = bullet.type === "drone" ? baseDamage : baseDamage + dronePower;
            enemy.hp -= damage;
            if (bullet.type !== "drone") {
                runMetrics.shotsHit += 1;
            }


            if (bullet.type !== "resonance") {
                state.bullets.splice(bi, 1);
            }

            if (bullet.type === "resonance") {
                applySlow(enemy);
            }

      if(enemy.hp <= 0){
        const isBoss = enemy.type === "boss";
                maybeDropCollectible(enemy);
        state.enemies.splice(ei, 1);

        if(isBoss){
                    runMetrics.bossesKilled += 1;
                    rewardScoreForKill();
                    rewardCredits(100);
          state.bossActive = false;
                    handleBossProgression();
                    world++;
                    worldAnnouncementTimer = 180;
        }else{
                    runMetrics.enemiesDestroyed += 1;
                                        playExplosion();
                    rewardScoreForKill();
                    rewardCredits(5);
          state.killsThisWave++;
        }
      }
      break; // la balle est détruite, on sort
    }
  }
}       
    

   // Player -> enemies (circle vs rect)
const pr = Math.min(player.width, player.height) * (isMobileDevice ? 0.31 : 0.35);

for(let ei = state.enemies.length - 1; ei >= 0; ei--){
  const e = state.enemies[ei];
  const er = (e.size || 45) * 0.35;

  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const d2 = dx*dx + dy*dy;

  if(d2 < (pr + er) * (pr + er)){
    // touche
    if(e.type !== "boss") state.enemies.splice(ei, 1);

    if(damageCooldown === 0){
            if (shieldTimeLeft > 0) {
                shieldTimeLeft = Math.max(0, shieldTimeLeft - 3);
            } else {
                ui.lives -= 1;
                runMetrics.damageTaken += 1;
            }
      damageCooldown = 50;
      if(ui.lives <= 0) ui.gameOver = true;
    }
  }
}
}
function updateHUD(){
    const scoreEl = document.getElementById("scoreCount");
    const levelEl = document.getElementById("levelCount");

    if(scoreEl) scoreEl.textContent = ui.score;
    if(levelEl) levelEl.textContent = ui.level;
    updateCreditsHUD();
}

function updateIntensityHUD() {
    const intensityEl = document.getElementById("intensityHUD");
    if (intensityEl) {
        intensityEl.textContent = "INTENSITÉ x" + intensity.toFixed(1) + (isHardcoreMode ? " • HARDCORE MODE" : "");

        if (intensity > 3) {
            const pulse = 0.5 + (Math.sin(performance.now() * 0.01) * 0.5);
            intensityEl.style.color = "#9ffcff";
            intensityEl.style.boxShadow = `0 0 ${12 + pulse * 14}px rgba(120, 240, 255, 0.75)`;
            intensityEl.style.textShadow = "0 0 10px rgba(180,255,255,0.8)";
        } else {
            intensityEl.style.color = "#00eaff";
            intensityEl.style.boxShadow = "0 0 12px rgba(0, 234, 255, 0.35)";
            intensityEl.style.textShadow = "none";
        }
    }
}

function updateCreditsHUD() {
    const el = document.getElementById("creditsDisplay") || document.getElementById("creditCount");
    if (el && profile) {
        el.textContent = profile.credits;
    }
}

function updateEnergy(deltaTime) {
    const regenMultiplier = getCurrentEnergyRegenMultiplier();
    if (!isFiring) {
        energy += energyRegenRate * 1.8 * regenMultiplier * deltaTime;
    } else {
        energy += energyRegenRate * regenMultiplier * deltaTime;
    }
    if (energy > maxEnergy) energy = maxEnergy;
}

function updateEnergyBar() {
    const fill = document.getElementById("energyFill");
    if (!fill) return;
    const percent = (energy / maxEnergy) * 100;
    fill.style.width = percent + "%";

    if (energy < 20) {
        fill.style.background = "linear-gradient(90deg, #ff3b3b, #ff8800)";
        fill.style.boxShadow = "0 0 15px rgba(255,60,60,0.7)";
    } else {
        fill.style.background = "linear-gradient(90deg, #00eaff, #00ff88)";
        fill.style.boxShadow = "0 0 10px rgba(0,255,255,0.4)";
    }
}

function updateModuleHUD() {

    const hud = document.getElementById("moduleHUD");
    const icon = document.getElementById("moduleIcon");
    const name = document.getElementById("moduleName");
    if (!hud || !icon || !name) return;

    hud.classList.remove("flux", "impact", "resonance", "lazer", "nova");

    if (!profile || !profile.equippedModule) {
        name.textContent = "AUCUN";
        icon.textContent = "–";
        return;
    }

    const mod = profile.equippedModule;

    hud.classList.add(mod);

    name.textContent = mod.toUpperCase();

    if (mod === "flux") icon.textContent = "⚡";
    if (mod === "impact") icon.textContent = "💥";
    if (mod === "resonance") icon.textContent = "🫧";
    if (mod === "lazer") icon.textContent = "🔆";
    if (mod === "nova") icon.textContent = "✨";

    // petite animation flash
    hud.classList.add("flash");
    setTimeout(() => hud.classList.remove("flash"), 400);
}

function drawGameOver(){
    if (!gameOverStatsSaved) {
        commitRunStats();

        const scoresBefore = JSON.parse(localStorage.getItem("nv_scores")) || [];
        const previousHighScore = scoresBefore.length ? scoresBefore[0] : 0;
        isNewRecord = ui.score > previousHighScore;

        saveScore(ui.score);

        const scoresAfter = JSON.parse(localStorage.getItem("nv_scores")) || [];
        highScore = scoresAfter.length ? scoresAfter[0] : 0;
        localStorage.setItem("nv_highscore", String(highScore));

        gameOverStatsSaved = true;
        gameOverAnimStart = performance.now();
    }

    if (gameOverAnimStart === null) {
        gameOverAnimStart = performance.now();
    }

    const elapsed = performance.now() - gameOverAnimStart;
    const t = Math.min(elapsed / 600, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const scale = 0.9 + (0.1 * ease);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.save();
    ctx.globalAlpha = t;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";

    ctx.fillStyle = "#00fff7";
    ctx.font = "48px Orbitron, sans-serif";
    ctx.fillText("GAME OVER", 0, 0);

    if (isNewRecord) {
        ctx.fillStyle = "#fff7a0";
        ctx.shadowColor = "rgba(255, 240, 130, 0.9)";
        ctx.shadowBlur = 22;
        ctx.font = "26px Orbitron, sans-serif";
        ctx.fillText("✨ NOUVEAU RECORD ✨", 0, 40);
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "#00fff7";
    ctx.font = "20px Orbitron, sans-serif";
    ctx.fillText("SCORE FINAL : " + ui.score, 0, 90);

    let intensityColor = "#00eaff";
    if (maxIntensityReached >= 4) {
        intensityColor = "#ff3b3b";
    } else if (maxIntensityReached >= 2) {
        intensityColor = "#b26dff";
    }
    ctx.fillStyle = intensityColor;
    ctx.shadowColor = intensityColor;
    ctx.shadowBlur = 14;
    ctx.fillText("INTENSITÉ MAX : x" + maxIntensityReached.toFixed(1), 0, 120);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#00fff7";
    ctx.fillText("MEILLEUR SCORE : " + highScore, 0, 150);
    ctx.fillText("COMBO MAX : x" + comboPeak, 0, 180);
    ctx.font = "16px Orbitron, sans-serif";
    ctx.fillText("TOP 5 LOCAL", 0, 215);

    const scores = JSON.parse(localStorage.getItem("nv_scores")) || [];
    ctx.font = "20px Orbitron, sans-serif";
    scores.forEach((s, i) => {
        ctx.fillText(`${i + 1}. ${s}`, 0, 245 + i * 30);
    });

    ctx.fillText("Appuie sur R pour recommencer", 0, 420);
    ctx.restore();
}

function resetGame(){
  wave = 1;
    world = 1;
        runMetrics = createRunMetrics();
        runMetricsCommitted = false;
        updateRunWorldReached(1);
        playerStats.totalRuns += 1;
        savePlayerStats();

  ui.level = 1;
  ui.score = 0;
    ui.lives = hasHaloCosmique ? 4 : 3;
        player.lives = ui.lives;
  ui.gameOver = false;

  tension = 0;
  levelFlash = 0;

  boost.active = false;
  boost.t = 0;

  state.enemies = [];
  state.bullets = [];
  state.enemyBullets = [];
    state.collectibles = [];
  state.drones = [];
        initDrones(dronePower);
    impacts = [];

    comboCount = 0;
    comboPeak = 0;
    comboTimer = 0;
    comboPopupTimer = 0;
    pickupMessage = "";
    pickupMessageTimer = 0;
    shieldTimeLeft = 0;
    lazerBeamActive = false;
    lazerCharge = LAZER_CHARGE_MAX;
    activeBuff.type = null;
    activeBuff.timeLeft = 0;

  state.bossActive = false;
  state.killsThisWave = 0;
  state.killsTarget = 5;

  state.lastEnemySpawn = 0;
  state.lastFire = 0;
    energy = maxEnergy;
    gameTime = 0;
    intensityBase = 1;
    intensityGrowthDivisor = 60;
    enemySpeedMultiplier = 1;
    enemyFireRateMultiplier = 1;
    lazerRechargeMultiplier = 1;
    intensity = intensityBase;
        maxIntensityReached = 1;
    intensityTier = 1;
    enemySpawnRate = 2000;
    gameOverStatsSaved = false;
    isNewRecord = false;
    gameOverAnimStart = null;
    worldAnnouncementTimer = 0;

    initGame();

  resetPlayerPosition();
    updateCreditsHUD();
    updateEnergyBar();
    setGameplayHUDVisibility(true);
}

function applyHardcoreRules(){
    ui.lives = 1;
    player.lives = 1;

    intensityBase = 1.4;
    intensity = intensityBase;

    enemySpeedMultiplier = 1.1;
    enemyFireRateMultiplier = 1.1;

    lazerRechargeMultiplier *= 1.2;
}

function initGame(){
    document.body.classList.remove("hardcore");

    if(profile?.hardcoreMode){
        applyHardcoreRules();
        document.body.classList.add("hardcore");
    }
}

function setGameplayHUDVisibility(visible) {
    const display = visible ? "" : "none";
    const hud = document.getElementById("hud");
    const moduleHUD = document.getElementById("moduleHUD");
    const intensityHUD = document.getElementById("intensityHUD");
    const shootButton = document.getElementById("shootBtn");
    const energyBar = document.querySelector(".energy-bar");

    if (hud) hud.style.display = display;
    if (moduleHUD) moduleHUD.style.display = display;
    if (intensityHUD) intensityHUD.style.display = display;
    if (energyBar) energyBar.style.display = display;

    if (shootButton) {
        if (!visible) {
            shootButton.style.display = "none";
        } else {
            shootButton.style.display = (isMobileDevice && fireMode === "manualButton") ? "block" : "none";
        }
    }
}

function applyHUDScale() {
    const hud = document.getElementById("hud");
    const moduleHUD = document.getElementById("moduleHUD");
    const intensityHUD = document.getElementById("intensityHUD");
    const energyBar = document.querySelector(".energy-bar");

    if (hud) {
        hud.style.scale = String(hudScaleValue);
        hud.style.transformOrigin = "top left";
    }
    if (moduleHUD) {
        moduleHUD.style.scale = String(hudScaleValue);
    }
    if (intensityHUD) {
        intensityHUD.style.scale = String(hudScaleValue);
        intensityHUD.style.transformOrigin = "top right";
    }
    if (energyBar) {
        energyBar.style.scale = String(hudScaleValue);
    }
}

function applyCanvasVisualFilter() {
    const boostedBrightness = flashFilterBoostActive
        ? Math.min(140, graphicsBrightness * 1.1)
        : graphicsBrightness;
    canvas.style.filter = `brightness(${boostedBrightness}%) contrast(${graphicsContrast}%)`;
}

window.addEventListener("keydown", (e)=>{
    if(ui.gameOver && (e.key === "r" || e.key === "R")) resetGame();
});

// ============================
// DRAW
// ============================
function drawAura(){

    const time = performance.now() * 0.0015;
    const shimmer = 0.07 + Math.sin(time) * 0.01;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = shimmer;

    const size = Math.max(player.width, player.height) * 1.28;

    const gradient = ctx.createRadialGradient(
        player.x,
        player.y,
        size * 0.3,
        player.x,
        player.y,
        size
    );

    gradient.addColorStop(0, "rgba(210,185,255,0.72)");
    gradient.addColorStop(0.45, "rgba(155,120,235,0.28)");
    gradient.addColorStop(0.75, "rgba(110,80,190,0.1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPlayer(){
    const size = getShipSize();
    player.width = size.width;
    player.height = size.height;

    if (shieldTimeLeft > 0) {
        const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.08;
        const shieldRadius = Math.max(player.width, player.height) * 0.78 * pulse;
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.shadowColor = "#8fe8ff";
        ctx.shadowBlur = 16;
        ctx.strokeStyle = "rgba(159, 232, 255, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(player.x, player.y, shieldRadius * 1.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Cooldown dégâts : effet visuel
    if(damageCooldown > 0){
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(damageCooldown * 0.5);
        ctx.filter = "brightness(2)";
    }
    ctx.drawImage(
        shipImg,
        player.x - player.width/2,
        player.y - player.height/2,
        player.width,
        player.height
    );
    if(damageCooldown > 0){
        ctx.restore();
    }

    // Effet moteur
    const engineHeight = player.height * 0.4 + ui.level * 2;
    const gradient = ctx.createLinearGradient(
        player.x,
        player.y,
        player.x,
        player.y + engineHeight
    );
    gradient.addColorStop(0, "rgba(0,255,255,0.8)");
    gradient.addColorStop(1, "rgba(0,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(
        player.x,
        player.y + player.height / 2,
        player.width * 0.15,
        engineHeight,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
}
    // ...existing code... 


function drawEnemyBullets(){
    for(const b of state.enemyBullets){
        if (b.type === "spectra") {
            ctx.save();
            const vx = b.vx || 0;
            const vy = b.vy || 6;
            const angle = Math.atan2(vy, vx) + Math.PI / 2;
            const radius = b.r || 7;
            const length = radius * 2.8;
            const width = radius * 1.15;
            const trail = radius * 3.4;

            ctx.translate(b.x, b.y);
            ctx.rotate(angle);

            ctx.shadowColor = "rgba(170,80,255,0.95)";
            ctx.shadowBlur = 22;

            const trailGradient = ctx.createLinearGradient(0, trail * 0.55, 0, -trail);
            trailGradient.addColorStop(0, "rgba(210,150,255,0.5)");
            trailGradient.addColorStop(1, "rgba(210,150,255,0)");
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.moveTo(-width * 0.42, radius * 0.3);
            ctx.lineTo(width * 0.42, radius * 0.3);
            ctx.lineTo(width * 0.16, -trail);
            ctx.lineTo(-width * 0.16, -trail);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(210,120,255,0.96)";
            ctx.beginPath();
            ctx.moveTo(0, -length);
            ctx.lineTo(width, radius * 0.35);
            ctx.lineTo(0, length * 0.35);
            ctx.lineTo(-width, radius * 0.35);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(255,240,255,0.92)";
            ctx.beginPath();
            ctx.moveTo(0, -length * 0.7);
            ctx.lineTo(width * 0.35, 0);
            ctx.lineTo(0, length * 0.12);
            ctx.lineTo(-width * 0.35, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
            continue;
        }
        ctx.save();
        const radius = b.r || 6;
        const bulletColor = b.color || "#ff4a8b";
        const vx = b.vx || 0;
        const vy = b.vy || 6;
        const angle = Math.atan2(vy, vx) + Math.PI / 2;
        const length = radius * 2.4;
        const width = radius * 1.05;
        const trailLength = radius * 2.7;

        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.shadowColor = bulletColor;
        ctx.shadowBlur = 14;

        const trailGradient = ctx.createLinearGradient(0, trailLength * 0.5, 0, -trailLength);
        trailGradient.addColorStop(0, "rgba(255, 185, 215, 0.5)");
        trailGradient.addColorStop(1, "rgba(255, 185, 215, 0)");
        ctx.fillStyle = trailGradient;
        ctx.beginPath();
        ctx.moveTo(-width * 0.35, radius * 0.3);
        ctx.lineTo(width * 0.35, radius * 0.3);
        ctx.lineTo(width * 0.13, -trailLength);
        ctx.lineTo(-width * 0.13, -trailLength);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = bulletColor;
        ctx.beginPath();
        ctx.moveTo(0, -length);
        ctx.lineTo(width, radius * 0.4);
        ctx.lineTo(0, length * 0.35);
        ctx.lineTo(-width, radius * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(255,240,246,0.9)";
        ctx.beginPath();
        ctx.moveTo(0, -length * 0.72);
        ctx.lineTo(width * 0.32, 0);
        ctx.lineTo(0, length * 0.12);
        ctx.lineTo(-width * 0.32, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}


function drawDrones(){

    const hasGlow = dronePower >= 3;
    const hasStrongTrail = dronePower >= 4;

    if (state.drones.length > 0) {
        const t = performance.now() * 0.006;
        const pulse = 1 + Math.sin(t) * 0.08;
        const coreRadius = 6.2 * pulse;

        ctx.save();
        ctx.shadowColor = "#7a4dff";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(player.x, player.y, coreRadius + 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(122, 77, 255, 0.16)";
        ctx.fill();

        ctx.shadowColor = "#00eaff";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(player.x, player.y, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 234, 255, 0.78)";
        ctx.fill();
        ctx.restore();
    }

    state.drones.forEach(d => {

        ctx.save();
        ctx.strokeStyle = hasStrongTrail ? "rgba(0, 234, 255, 0.5)" : "rgba(0, 234, 255, 0.22)";
        ctx.lineWidth = hasStrongTrail ? 2.2 : 1.2;
        if (hasStrongTrail) {
            ctx.shadowColor = "#00eaff";
            ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
        ctx.restore();

        if (hasStrongTrail) {
            ctx.save();
            ctx.strokeStyle = "rgba(120, 240, 255, 0.5)";
            ctx.lineWidth = 2;
            ctx.shadowColor = "rgba(120, 240, 255, 0.9)";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(d.prevX ?? d.x, d.prevY ?? d.y);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.shadowColor = "#00eaff";
        ctx.shadowBlur = hasGlow ? 24 : 15;

        if (hasGlow) {
            ctx.beginPath();
            ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 234, 255, 0.22)";
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#00eaff";
        ctx.fill();

        ctx.restore();
    });
}

function drawImpacts(){
    impacts.forEach(i => {
        ctx.beginPath();
        ctx.arc(i.x, i.y, i.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 234, 255," + i.alpha + ")";
        ctx.fill();
    });
}

function drawBullets(){
    if (lazerBeamActive) {
        const beamStartY = player.y - player.height * 0.55;
        const beamEndY = -30;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const outer = ctx.createLinearGradient(player.x, beamStartY, player.x, beamEndY);
        outer.addColorStop(0, "rgba(0, 220, 255, 0.7)");
        outer.addColorStop(1, "rgba(0, 160, 255, 0.25)");
        ctx.strokeStyle = outer;
        ctx.lineWidth = LAZER_BEAM_WIDTH;
        ctx.shadowColor = "rgba(0, 220, 255, 0.95)";
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.moveTo(player.x, beamStartY);
        ctx.lineTo(player.x, beamEndY);
        ctx.stroke();

        const inner = ctx.createLinearGradient(player.x, beamStartY, player.x, beamEndY);
        inner.addColorStop(0, "rgba(220, 255, 255, 0.95)");
        inner.addColorStop(1, "rgba(120, 245, 255, 0.55)");
        ctx.strokeStyle = inner;
        ctx.lineWidth = 5;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(player.x, beamStartY);
        ctx.lineTo(player.x, beamEndY);
        ctx.stroke();

        ctx.restore();
    }

    state.bullets.forEach(b=>{
        if (b.type === "resonance") {
            ctx.save();
            ctx.fillStyle = "#b84cff";
            ctx.shadowColor = "#b84cff";
            ctx.shadowBlur = 20;
            ctx.fillRect(b.x - ((b.width || 4) / 2), b.y - ((b.height || 22) / 2), b.width || 4, b.height || 22);
            ctx.restore();
        } else if (b.type === "impact") {
            ctx.save();
            ctx.fillStyle = "#ff4cff";
            ctx.shadowColor = "#ff4cff";
            ctx.shadowBlur = 20;
            ctx.fillRect(b.x - ((b.width || 12) / 2), b.y - ((b.height || 22) / 2), b.width || 12, b.height || 22);
            ctx.restore();
        } else if (b.type === "flux") {
            ctx.save();
            ctx.fillStyle = "#00ff88";
            ctx.shadowColor = "#00ff88";
            ctx.shadowBlur = 10;
            ctx.fillRect(b.x - ((b.width || 4) / 2), b.y - ((b.height || 22) / 2), b.width || 4, b.height || 22);
            ctx.restore();
        } else if (b.type === "lazer") {
            ctx.save();
            ctx.fillStyle = "#00e1ff";
            ctx.shadowColor = "#00e1ff";
            ctx.shadowBlur = 14;
            ctx.fillRect(b.x - ((b.width || 4) / 2), b.y - ((b.height || 22) / 2), b.width || 4, b.height || 22);
            ctx.restore();
        } else if (b.type === "nova") {
            ctx.save();
            ctx.fillStyle = "#ffd4ff";
            ctx.shadowColor = "#ff9dff";
            ctx.shadowBlur = 18;
            ctx.fillRect(b.x - ((b.width || 12) / 2), b.y - ((b.height || 22) / 2), b.width || 12, b.height || 22);
            ctx.restore();
        } else {
            ctx.fillStyle = "white";
            ctx.fillRect(b.x - 3, b.y - 6, 6, 12);
        }
    });
}

function drawCollectibles() {
    for (const c of state.collectibles) {
        const pulse = 1 + Math.sin(c.pulse) * 0.14;
        const radius = (c.size || 9) * pulse;
        const lifeRatio = Math.max(0, Math.min(1, c.life / 8));

        let coreColor = "#00ff88";
        let ringColor = "rgba(120,255,200,0.85)";
        if (c.type === "life") {
            coreColor = "#ff6ea9";
            ringColor = "rgba(255,170,210,0.92)";
        } else if (c.type === "shield") {
            coreColor = "#8fe8ff";
            ringColor = "rgba(170,235,255,0.9)";
        } else if (c.type === "overdrive") {
            coreColor = "#b3ff8a";
            ringColor = "rgba(220,255,170,0.9)";
        }

        ctx.save();

        const halo = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius * 2.4);
        halo.addColorStop(0, c.type === "overdrive"
            ? "rgba(180,255,140,0.55)"
            : (c.type === "shield"
                ? "rgba(150,220,255,0.55)"
                : (c.type === "life" ? "rgba(255,120,185,0.58)" : "rgba(0,255,170,0.45)")));
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.75 + Math.sin(c.pulse * 1.3) * 0.2;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius * 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = lifeRatio;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius * 1.35, c.spin, c.spin + Math.PI * 1.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius * 1.05, -c.spin * 0.85, -c.spin * 0.85 + Math.PI * 1.1);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        if (c.type === "energy") {
            ctx.beginPath();
            ctx.moveTo(c.x - radius * 0.2, c.y - radius * 0.75);
            ctx.lineTo(c.x + radius * 0.05, c.y - radius * 0.1);
            ctx.lineTo(c.x - radius * 0.05, c.y - radius * 0.1);
            ctx.lineTo(c.x + radius * 0.2, c.y + radius * 0.75);
            ctx.lineTo(c.x - radius * 0.05, c.y + radius * 0.1);
            ctx.lineTo(c.x + radius * 0.05, c.y + radius * 0.1);
            ctx.closePath();
            ctx.fill();
        } else if (c.type === "life") {
            const heartTopY = c.y - radius * 0.12;
            const lobRadius = radius * 0.33;

            ctx.beginPath();
            ctx.arc(c.x - lobRadius, heartTopY, lobRadius, 0, Math.PI * 2);
            ctx.arc(c.x + lobRadius, heartTopY, lobRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(c.x - radius * 0.72, heartTopY + lobRadius * 0.5);
            ctx.lineTo(c.x + radius * 0.72, heartTopY + lobRadius * 0.5);
            ctx.lineTo(c.x, c.y + radius * 0.82);
            ctx.closePath();
            ctx.fill();
        } else if (c.type === "shield") {
            ctx.beginPath();
            ctx.moveTo(c.x, c.y - radius * 0.72);
            ctx.lineTo(c.x + radius * 0.52, c.y - radius * 0.4);
            ctx.lineTo(c.x + radius * 0.42, c.y + radius * 0.45);
            ctx.lineTo(c.x, c.y + radius * 0.75);
            ctx.lineTo(c.x - radius * 0.42, c.y + radius * 0.45);
            ctx.lineTo(c.x - radius * 0.52, c.y - radius * 0.4);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.spin * 0.7);
            ctx.beginPath();
            ctx.moveTo(0, -radius * 0.75);
            ctx.lineTo(radius * 0.58, 0);
            ctx.lineTo(0, radius * 0.75);
            ctx.lineTo(-radius * 0.58, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        for (let k = 0; k < 2; k++) {
            const orbAngle = c.spin + k * Math.PI;
            const ox = c.x + Math.cos(orbAngle) * radius * 1.8;
            const oy = c.y + Math.sin(orbAngle) * radius * 1.8;
            ctx.beginPath();
            ctx.arc(ox, oy, radius * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(230,255,255,0.9)";
            ctx.fill();
        }

        ctx.restore();
    }
}

function drawEnemies(){
    // --- Premium rendering différencié boss/ennemi ---
    // (remplace le forEach initial)
    for (const e of state.enemies) {
        // --- Hit shake (léger) ---
        let dx = 0, dy = 0;
        if (e.hitTimer > 0) {
            const s = e.hitShake || 2;
            dx = (Math.random() - 0.5) * s;
            dy = (Math.random() - 0.5) * s;
        }

        // --- Boss pulse (plus visible) ---
        let scale = 1;
        if (e.type === "boss") {
            const tt = performance.now() * 0.004 + (e.pulsePhase || 0);
            scale = 1 + Math.sin(tt) * 0.05;
        }

        const size = e.size * scale;
        const cx = e.x + dx;
        const cy = e.y + dy;

        // --- Micro moteur (flicker discret) ---
        {
            const t = performance.now() * 0.02 + (e.enginePhase || 0);
            const flicker = 0.55 + Math.sin(t) * 0.25;
            const flameLen = e.size * (0.18 + flicker * 0.12);
            const flameW = e.size * 0.10;

            ctx.save();
            ctx.globalAlpha = 0.22 + flicker * 0.22;
            ctx.shadowColor = e.color || "rgba(255,0,200,0.85)";
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(cx, cy + (size * 0.40));
            ctx.lineTo(cx - flameW, cy + (size * 0.40) + flameLen);
            ctx.lineTo(cx + flameW, cy + (size * 0.40) + flameLen);
            ctx.closePath();
            ctx.fillStyle = e.color || "rgba(255,0,200,0.55)";
            ctx.fill();

            ctx.restore();
        }

        // --- Aura spéciale boss ---
        if (e.type === "boss") {
            ctx.save();
            ctx.shadowColor = "rgba(140,0,255,0.9)";
            ctx.shadowBlur = 35;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(140,0,255,0.35)";
            ctx.fill();
            ctx.restore();
        }

        // --- Sprite brut (sans shadow) + align pixel ---
        const img = (e.type === "boss") ? bossImg : enemyImg;
        const drawS = Math.round(size);
        if (e.type !== "boss") {
            const bankAngle = e.bankAngle || 0;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(bankAngle);
            ctx.shadowColor = "#ff2a6d";
            ctx.shadowBlur = 15;
            ctx.drawImage(img, -drawS / 2, -drawS / 2, drawS, drawS);
            ctx.restore();
            ctx.shadowBlur = 0;
        } else {
            const drawX = Math.round(cx - size / 2);
            const drawY = Math.round(cy - size / 2);
            ctx.drawImage(img, drawX, drawY, drawS, drawS);
        }

        // --- Flash impact (hit) : propre, rond, jamais carré ---
        if (e.hitTimer > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.10 + e.hitTimer * 0.03;
            ctx.beginPath();
            ctx.arc(cx, cy, e.size * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.restore();
        }
    }
}

// ============================
// MAIN LOOP
// ============================
function gameLoop(timestamp){
    if (lastFrameTime === null) {
        lastFrameTime = timestamp;
    }
    const rawDeltaTime = (timestamp - lastFrameTime) / 1000;
    const deltaTime = Math.min(rawDeltaTime, 0.05);
    const gameplayDeltaTime = deltaTime * combatSpeedMultiplier;
    lastFrameTime = timestamp;
    runMetrics.playTime += deltaTime;
    updateRunWorldReached(world);

    if(damageCooldown > 0) damageCooldown--;
    if(worldAnnouncementTimer > 0) worldAnnouncementTimer--;



    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (screenShakeEnabled && !ui.gameOver && damageCooldown > 0) {
        const shakeStrength = Math.min(7, damageCooldown * 0.16);
        if (shakeStrength > 0.2) {
            const shakeX = (Math.random() - 0.5) * shakeStrength;
            const shakeY = (Math.random() - 0.5) * shakeStrength;
            ctx.translate(shakeX, shakeY);
        }
    }

    drawNebula();

    // --- FOND SPATIAL ---
    // 1. Planètes (arrière-plan)
    updatePlanets();
    drawPlanets();

    // 2. Météorites (couche intermédiaire)
    if(Math.random() < 0.02){
        spawnMeteor();
    }
    updateMeteors();
    drawMeteors();

    // 3. Étoiles (avant-plan)
    updateStars();
    drawStars();

    // Flash niveau
    if(levelFlash > 0){
        ctx.fillStyle = "rgba(0,255,255,0.05)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        levelFlash--;
    }

    // HUD affiché en haut à gauche
    drawHUD();

    if(ui.gameOver){
        setGameplayHUDVisibility(false);
        drawGameOver();
        ctx.restore();
        return requestAnimationFrame(gameLoop);
    }

    setGameplayHUDVisibility(true);

    // Updates
    updatePlayer();
    updateDrones(timestamp);
    updateDifficulty(gameplayDeltaTime);
    updateEnergy(gameplayDeltaTime);
    if(isFiring){
        shoot(timestamp);
    }

    if (!isFiring || activeModuleId !== "lazer") {
        lazerBeamActive = false;
    }

    if (lazerBeamActive) {
        const chargeDrain = LAZER_CHARGE_DRAIN_PER_SEC * gameplayDeltaTime;
        if (lazerCharge <= chargeDrain) {
            lazerCharge = 0;
            lazerBeamActive = false;
        } else {
            lazerCharge -= chargeDrain;
        }

        const drain = LAZER_BEAM_ENERGY_PER_SEC * gameplayDeltaTime;
        if (energy <= drain) {
            energy = 0;
            lazerBeamActive = false;
        } else {
            energy -= drain;
        }
    } else if (activeModuleId === "lazer") {
        lazerCharge = Math.min(LAZER_CHARGE_MAX, lazerCharge + (LAZER_CHARGE_REGEN_PER_SEC / lazerRechargeMultiplier) * gameplayDeltaTime);
    }

    updateBullets();
    updateEnemyBullets();
    spawnEnemy(timestamp); 
    updateEnemies(gameplayDeltaTime);
    updateTension();
    handleCollisions();
    updateCollectibles(gameplayDeltaTime);
    collectPickups();
    updateCombo(gameplayDeltaTime);
    updateBuff(gameplayDeltaTime);
    updateImpacts();
    updateHUD();
    updateEnergyBar();

    // Fin de vague : progression uniquement si tout est clear
    if(isWaveCleared()){
        startNextWave();
    }

    // Draw
    drawAura();
    drawPlayer();
    drawDrones();
    drawBullets();
    drawCollectibles();
    drawImpacts();
    drawEnemies();
    drawEnemyBullets();   // ← ICI le manquant

    if(worldAnnouncementTimer > 0){

        ctx.save();
        ctx.globalAlpha = worldAnnouncementTimer / 180;

        ctx.fillStyle = "#d8c8ff";
        ctx.font = "bold 36px Orbitron";
        ctx.textAlign = "center";

        ctx.fillText("WORLD " + world, canvas.width/2, canvas.height/2);

        ctx.restore();
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// --- Gestion orientation responsive ---
function checkOrientation(){
    const block = document.getElementById("orientationBlock");
    if(!block) return;

    if(!isMobileDevice){
        block.style.display = "none";
        return;
    }

    const isLandscape = window.innerWidth > window.innerHeight;
    block.style.display = isLandscape ? "flex" : "none";
}

window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
window.addEventListener("load", () => {
    applyHUDScale();
    applyCanvasVisualFilter();
    checkOrientation();
    updateCreditsHUD();
    updateModuleHUD();
    updateEnergyBar();
    updateIntensityHUD();
});

resetGame();

shipImg.onload = () => {
    requestAnimationFrame(gameLoop);
};

// =====================
// AUDIO SYSTEM
// =====================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playIntensityPulse(){
    if (sfxVolumeMultiplier <= 0) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(340, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.04 * sfxVolumeMultiplier, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function playShootSound(){
    if (sfxVolumeMultiplier <= 0) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth"; // son spatial moderne
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2 * sfxVolumeMultiplier, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
}

function playLifePickupSound() {
    if (sfxVolumeMultiplier <= 0) return;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = "triangle";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(620, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1040, audioCtx.currentTime + 0.14);

    osc2.frequency.setValueAtTime(930, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1480, audioCtx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16 * sfxVolumeMultiplier, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.18);
    osc2.stop(audioCtx.currentTime + 0.18);
}

function playShieldPickupSound() {
    if (sfxVolumeMultiplier <= 0) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(360, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, audioCtx.currentTime + 0.16);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, audioCtx.currentTime);
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14 * sfxVolumeMultiplier, audioCtx.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.22);
}