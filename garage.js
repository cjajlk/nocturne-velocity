// ==========================
// NOCTURNE VELOCITY PROFILE
// ==========================

const MODULE_CATALOG = {
    flux: { name: "Flux", price: 2000, cooldown: 340, energyCost: 10, damage: 1 },
    impact: { name: "Impact", price: 4000, cooldown: 620, energyCost: 22, damage: 5 },
    resonance: { name: "Résonance", price: 6000, cooldown: 370, energyCost: 10, damage: 1 },
    lazer: { name: "Lazer", price: 7000, cooldown: 260, energyCost: 12, damage: 1 },
    nova: { name: "Nova", price: 9000, cooldown: 520, energyCost: 20, damage: 3 }
};

const SHIP_CATALOG = [
    { id: "vaisseau1", name: "Nocturne Mk-I", status: "Disponible", price: 0, asset: "assets/vaisseau/vaisseau1.png" },
    { id: "vaisseau2", name: "Nocturne Mk-II", status: "Déverrouillable", price: 12000, asset: "assets/vaisseau/vaisseau2.png" },
    { id: "vaisseau3", name: "Nocturne Mk-III", status: "Déverrouillable", price: 22000, asset: "assets/vaisseau/vaisseau3.png" }
];

function normalizeShipId(shipId) {
    if (typeof shipId !== "string") return null;
    const cleaned = shipId.trim().toLowerCase().replace(/\.png$/i, "");
    return /^vaisseau\d+$/.test(cleaned) ? cleaned : null;
}

function getShipFromCatalog(shipId) {
    const normalizedShipId = normalizeShipId(shipId);
    if (!normalizedShipId) return null;
    return SHIP_CATALOG.find((ship) => ship.id === normalizedShipId) || null;
}

function getModuleCatalogSnapshot() {
    return JSON.parse(JSON.stringify(MODULE_CATALOG));
}

function getShopModulesFromCatalog(catalog) {
    const source = catalog && typeof catalog === "object" ? catalog : MODULE_CATALOG;
    return Object.keys(MODULE_CATALOG).map((id) => {
        const fallback = MODULE_CATALOG[id];
        const value = source[id] || {};
        return {
            id,
            name: typeof value.name === "string" ? value.name : fallback.name,
            price: Number.isFinite(value.price) ? value.price : fallback.price,
            cooldown: Number.isFinite(value.cooldown) ? value.cooldown : fallback.cooldown,
            energyCost: Number.isFinite(value.energyCost) ? value.energyCost : fallback.energyCost,
            damage: Number.isFinite(value.damage) ? value.damage : fallback.damage
        };
    });
}

function loadProfile() {
    const data = localStorage.getItem("nv_profile");

    const createDefaultDronesState = () => ({
        alpha: { unlocked: false, level: 0, maxLevel: 5 },
        beta: { unlocked: false, level: 0, maxLevel: 5 },
        gamma: { unlocked: false, level: 0, maxLevel: 5 }
    });

    const normalizeDroneId = (droneId) => {
        if (!droneId) return null;
        const value = String(droneId).toLowerCase().trim();
        const directMatch = value.match(/^drone\s*[-_]?\s*([1-6])$/);
        if (directMatch) return Number(directMatch[1]);
        const anyDigit = value.match(/([1-6])/);
        if (anyDigit) return Number(anyDigit[1]);
        return null;
    };

    const sanitizeDrone = (source, fallbackMax = 5) => {
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
    };

    const createDefaultGarageUnlocks = () => ({
        droneOverclock: false,
        haloCosmique: false
    });

    if (data) {
        let profileData;
        try {
            profileData = JSON.parse(data);
        } catch {
            profileData = null;
        }

        if (!profileData || typeof profileData !== "object") {
            localStorage.removeItem("nv_profile");
            return loadProfile();
        }

        const legacyModuleMap = {
            rapid: "flux",
            heavy: "impact"
        };

        if (legacyModuleMap[profileData.equippedModule]) {
            profileData.equippedModule = legacyModuleMap[profileData.equippedModule];
        }

        if (Array.isArray(profileData.ownedModules)) {
            profileData.ownedModules = profileData.ownedModules.map(moduleId => legacyModuleMap[moduleId] || moduleId);
            profileData.ownedModules = [...new Set(profileData.ownedModules)];
        } else {
            profileData.ownedModules = [];
        }

        profileData.equippedModule = typeof profileData.equippedModule === "string" ? profileData.equippedModule : null;
        profileData.credits = Number.isFinite(profileData.credits) ? profileData.credits : 0;

        const dronesState = createDefaultDronesState();

        if (profileData.drones && typeof profileData.drones === "object") {
            dronesState.alpha = sanitizeDrone(profileData.drones.alpha, 5);
            dronesState.beta = sanitizeDrone(profileData.drones.beta, 5);
            dronesState.gamma = sanitizeDrone(profileData.drones.gamma, 5);
        } else {
            const legacyLevels = [];
            if (Array.isArray(profileData.ownedDrones)) {
                profileData.ownedDrones
                    .map(normalizeDroneId)
                    .filter(Boolean)
                    .forEach(level => legacyLevels.push(level));
            }
            const equippedLegacy = normalizeDroneId(profileData.equippedDrone);
            if (equippedLegacy) {
                legacyLevels.push(equippedLegacy);
            }

            const legacyAlphaLevel = legacyLevels.length > 0 ? Math.max(...legacyLevels) : 0;
            if (legacyAlphaLevel > 0) {
                dronesState.alpha.unlocked = true;
                dronesState.alpha.level = Math.min(dronesState.alpha.maxLevel, legacyAlphaLevel);
            }
        }

        profileData.drones = dronesState;
        profileData.ownedDrones = dronesState.alpha.unlocked ? [`drone${dronesState.alpha.level}`] : [];
        profileData.equippedDrone = dronesState.alpha.unlocked ? "alpha" : null;
        profileData.garageUnlocks = {
            ...createDefaultGarageUnlocks(),
            ...(profileData.garageUnlocks || {})
        };
        profileData.world4Completed = Boolean(profileData.world4Completed || profileData.monde4Termine);
        profileData.monde4Termine = profileData.world4Completed;
        profileData.garageComplet = Boolean(profileData.garageComplet);
        profileData.hardcoreUnlocked = Boolean(profileData.hardcoreUnlocked);
        profileData.hardcoreMode = Boolean(profileData.hardcoreMode);
        const normalizedOwnedShips = Array.isArray(profileData.ownedShips)
            ? profileData.ownedShips
                .map(normalizeShipId)
                .filter(Boolean)
            : [];
        if (!normalizedOwnedShips.includes("vaisseau1")) {
            normalizedOwnedShips.unshift("vaisseau1");
        }
        profileData.ownedShips = [...new Set(normalizedOwnedShips)];
        const normalizedEquippedShip = normalizeShipId(profileData.equippedShip);
        profileData.equippedShip = normalizedEquippedShip && profileData.ownedShips.includes(normalizedEquippedShip)
            ? normalizedEquippedShip
            : "vaisseau1";
        profileData.moduleCatalog = getShopModulesFromCatalog(profileData.moduleCatalog).reduce((acc, module) => {
            acc[module.id] = {
                name: module.name,
                price: module.price,
                cooldown: module.cooldown,
                energyCost: module.energyCost,
                damage: module.damage
            };
            return acc;
        }, {});

        localStorage.setItem("nv_profile", JSON.stringify(profileData));
        return profileData;
    }

    const defaultProfile = {
        credits: 0,
        ownedModules: [],
        ownedShips: ["vaisseau1"],
        ownedDrones: [],
        equippedModule: null,
        equippedShip: "vaisseau1",
        equippedDrone: null,
        drones: {
            alpha: { unlocked: false, level: 0, maxLevel: 5 },
            beta: { unlocked: false, level: 0, maxLevel: 5 },
            gamma: { unlocked: false, level: 0, maxLevel: 5 }
        },
        garageUnlocks: {
            droneOverclock: false,
            haloCosmique: false
        },
        world4Completed: false,
        monde4Termine: false,
        garageComplet: false,
        hardcoreUnlocked: false,
        hardcoreMode: false,
        moduleCatalog: getModuleCatalogSnapshot()
    };

    localStorage.setItem("nv_profile", JSON.stringify(defaultProfile));
    return defaultProfile;
}

function saveProfile(options = {}) {
    savePlayerProfile(options);
}

const REQUIRED_MODULE_IDS = ["flux", "impact", "resonance", "lazer", "nova"];

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

function savePlayerProfile(options = {}) {
    const showHardcoreMessage = Boolean(options.showHardcoreMessage);

    profile.garageComplet = isGarageComplete(profile);

    const shouldUnlockHardcore = Boolean(profile.world4Completed) && Boolean(profile.garageComplet);
    if (shouldUnlockHardcore && !profile.hardcoreUnlocked) {
        profile.hardcoreUnlocked = true;
        if (showHardcoreMessage) {
            showPopup("Mode Hardcore débloqué", "Tu as terminé Monde 4 et complété le garage. Le mode Hardcore est maintenant disponible dans le menu.");
        }
    }

    profile.monde4Termine = Boolean(profile.world4Completed);
    profile.moduleCatalog = getShopModulesFromCatalog(profile.moduleCatalog).reduce((acc, module) => {
        acc[module.id] = {
            name: module.name,
            price: module.price,
            cooldown: module.cooldown,
            energyCost: module.energyCost,
            damage: module.damage
        };
        return acc;
    }, {});
    localStorage.setItem("nv_profile", JSON.stringify(profile));
}

let profile = loadProfile();

function updateCreditsDisplay() {
    const el = document.getElementById("creditsDisplay");
    if (el) {
        el.textContent = "Crédits lumineux : " + profile.credits;
    }
}

function showPopup(title, message) {
    const popup = document.getElementById("nv-popup");
    const titleEl = document.getElementById("nv-popup-title");
    const msgEl = document.getElementById("nv-popup-message");
    if (!popup || !titleEl || !msgEl) return;

    titleEl.textContent = title;
    msgEl.textContent = message;

    popup.classList.add("active");
}

function getDroneCooldownForLevel(level) {
    const table = {
        1: 800,
        2: 600,
        3: 450,
        4: 320,
        5: 220,
        6: 150
    };
    return table[level] || table[6];
}

function getDroneUpgradeCost(level) {
    const table = {
        1: 1500,
        2: 3000,
        3: 6000,
        4: 10000
    };
    return table[level] || 0;
}

function showDroneInfo(droneId) {
    const alphaLevel = profile?.drones?.alpha?.level || 0;
    const alphaMax = profile?.drones?.alpha?.maxLevel || 5;

    const infos = {
        alpha: {
            title: "Drone Alpha • Détails",
            lines: [
                `Statut : ${profile.drones.alpha.unlocked ? "Débloqué" : "Verrouillé"}`,
                `Niveau : ${alphaLevel} / ${alphaMax}`,
                "",
                "Progression cadence :",
                "N1 800ms • N2 600ms • N3 450ms",
                "N4 320ms • N5 220ms • N6 150ms",
                "",
                "Paliers visuels/combat :",
                "N3 : glow léger",
                "N4 : traînée lumineuse",
                "N5 : tir double"
            ]
        },
        beta: {
            title: "Drone Beta • Détails",
            lines: [
                "Statut : 🔒 Prochaine mise à jour",
                "Rôle prévu : soutien offensif complémentaire",
                "Progression : structure déjà prête"
            ]
        },
        gamma: {
            title: "Drone Gamma • Détails",
            lines: [
                "Statut : 🔒 Prochaine mise à jour",
                "Rôle prévu : spécialisation avancée",
                "Progression : structure déjà prête"
            ]
        }
    };

    const info = infos[droneId];
    if (!info) return;

    showPopup(info.title, info.lines.join("\n"));
}

function showModuleInfo(moduleId) {
    const module = shopModules.find(m => m.id === moduleId);
    if (!module) return;

    const owned = profile.ownedModules.includes(moduleId);
    const equipped = profile.equippedModule === moduleId;

    const infos = {
        flux: {
            title: "Module Flux • Détails",
            lines: [
                `Statut : ${owned ? "Débloqué" : "Verrouillé"}`,
                `Équipé : ${equipped ? "Oui" : "Non"}`,
                `Recharge : ${module.cooldown}ms`,
                `Énergie : ${module.energyCost}`,
                `Dégâts : ${module.damage}`,
                "",
                "Rôle : Polyvalent",
                "Bon équilibre cadence / contrôle"
            ]
        },
        impact: {
            title: "Module Impact • Détails",
            lines: [
                `Statut : ${owned ? "Débloqué" : "Verrouillé"}`,
                `Équipé : ${equipped ? "Oui" : "Non"}`,
                `Recharge : ${module.cooldown}ms`,
                `Énergie : ${module.energyCost}`,
                `Dégâts : ${module.damage}`,
                "",
                "Rôle : Burst",
                "Tirs lourds • dégâts élevés"
            ]
        },
        resonance: {
            title: "Module Résonance • Détails",
            lines: [
                `Statut : ${owned ? "Débloqué" : "Verrouillé"}`,
                `Équipé : ${equipped ? "Oui" : "Non"}`,
                `Recharge : ${module.cooldown}ms`,
                `Énergie : ${module.energyCost}`,
                `Dégâts : ${module.damage}`,
                "",
                "Rôle : Contrôle",
                "Perce et applique un ralentissement"
            ]
        },
        lazer: {
            title: "Module Lazer • Détails",
            lines: [
                `Statut : ${owned ? "Débloqué" : "Verrouillé"}`,
                `Équipé : ${equipped ? "Oui" : "Non"}`,
                `Recharge : ${module.cooldown}ms`,
                `Énergie : ${module.energyCost}`,
                `Dégâts : ${module.damage}`,
                "",
                "Rôle : Rayon continu",
                "Fort DPS, dépend de la recharge"
            ]
        },
        nova: {
            title: "Module Nova • Détails",
            lines: [
                `Statut : ${owned ? "Débloqué" : "Verrouillé"}`,
                `Équipé : ${equipped ? "Oui" : "Non"}`,
                `Recharge : ${module.cooldown}ms`,
                `Énergie : ${module.energyCost}`,
                `Dégâts : ${module.damage}`,
                "",
                "Rôle : Salve énergétique",
                "Projectile puissant en rafale"
            ]
        }
    };

    const info = infos[moduleId];
    if (!info) return;

    showPopup(info.title, info.lines.join("\n"));
}

function createCard(title, description, price, owned, equipped, type, id, badge, infoConfig = null) {
    return `
        <div class="garage-card">
            ${badge ? `<span class="role-badge ${badge.className}">${badge.label}</span>` : ""}
            <div class="card-head">
                <h3>${title}</h3>
                ${infoConfig ? `<button class="info-btn" onclick="${infoConfig.onClick}" aria-label="${infoConfig.ariaLabel}">ℹ</button>` : ""}
            </div>
            <p>${description}</p>
            <div class="price">${price} crédits</div>
            ${
                owned
                ? (equipped
                    ? `<button class="equip-btn equipped">Équipé</button>`
                    : `<button class="equip-btn" onclick="equipItem('${type}','${id}')">Équiper</button>`)
                : `<button class="buy-btn" onclick="buyItem('${type}','${id}',${price})">
                        Acheter
                   </button>`
            }
        </div>
    `;
}

function renderShop() {
    updateCreditsDisplay();
    const modulesContainer = document.getElementById('modules');
    const dronesContainer = document.getElementById('drones');
    const shipContainer = document.getElementById('ship');
    if (!modulesContainer || !dronesContainer || !shipContainer) return;

    modulesContainer.innerHTML = '<h2>Modules</h2>';
    shopModules.forEach(module => {
        const owned = profile.ownedModules.includes(module.id);
        const equipped = profile.equippedModule === module.id;
        let description = `Recharge : ${module.cooldown}ms`;
        let badge = null;
        if (module.id === 'flux') description = `Rôle : Polyvalent • Cadence stable (${module.cooldown}ms)`;
        if (module.id === 'flux') badge = { label: 'POLY', className: 'poly' };
        if (module.id === 'impact') description = `Rôle : Burst • Dégâts lourds x${module.damage} (${module.cooldown}ms)`;
        if (module.id === 'impact') badge = { label: 'BURST', className: 'burst' };
        if (module.id === 'resonance') description = `Rôle : Contrôle • Perce + ralentit (${module.cooldown}ms)`;
        if (module.id === 'resonance') badge = { label: 'CTRL', className: 'ctrl' };
        if (module.id === 'lazer') description = `Rôle : Rayon • Cadence très rapide (${module.cooldown}ms)`;
        if (module.id === 'lazer') badge = { label: 'RAYON', className: 'poly' };
        if (module.id === 'nova') description = `Rôle : Nova • Tir énergique x${module.damage} (${module.cooldown}ms)`;
        if (module.id === 'nova') badge = { label: 'NOVA', className: 'burst' };
        modulesContainer.innerHTML += createCard(
            module.name,
            description,
            module.price,
            owned,
            equipped,
            'module',
            module.id,
            badge,
            {
                onClick: `showModuleInfo('${module.id}')`,
                ariaLabel: `Infos ${module.name}`
            }
        );
    });

    dronesContainer.innerHTML = '<h2>Drones</h2>';
    const alpha = profile.drones.alpha;
    const alphaBuyPrice = 500;
    const alphaUpgradePrice = getDroneUpgradeCost(alpha.level);
    const currentCadence = alpha.level > 0 ? getDroneCooldownForLevel(alpha.level) : getDroneCooldownForLevel(1);

    if (!alpha.unlocked) {
        dronesContainer.innerHTML += `
        <div class="garage-card drone-card">
            <div class="card-head">
                <h3>Drone Alpha</h3>
                <button class="info-btn" onclick="showDroneInfo('alpha')" aria-label="Infos Drone Alpha">ℹ</button>
            </div>
            <p class="drone-meta">Drone niveau 1 • Niveau actuel : 0 / ${alpha.maxLevel}</p>
            <p>Cadence de départ : ${currentCadence}ms • Drone orbital offensif</p>
            <div class="price">${alphaBuyPrice} crédits</div>
            <button class="buy-btn" onclick="buyDroneAlpha()">Acheter Drone</button>
        </div>`;
    } else if (alpha.level < alpha.maxLevel) {
        dronesContainer.innerHTML += `
        <div class="garage-card drone-card">
            <div class="card-head">
                <h3>Drone Alpha</h3>
                <button class="info-btn" onclick="showDroneInfo('alpha')" aria-label="Infos Drone Alpha">ℹ</button>
            </div>
            <p class="drone-meta">Drone niveau ${alpha.level} • Niveau actuel : ${alpha.level} / ${alpha.maxLevel}</p>
            <p>Cadence actuelle : ${currentCadence}ms • Prochain coût : ${alphaUpgradePrice} crédits</p>
            <div class="price">Upgrade : ${alphaUpgradePrice} crédits</div>
            <button class="buy-btn" onclick="upgradeDroneAlpha()">Améliorer</button>
        </div>`;
    } else {
        dronesContainer.innerHTML += `
        <div class="garage-card drone-card">
            <div class="card-head">
                <h3>Drone Alpha</h3>
                <button class="info-btn" onclick="showDroneInfo('alpha')" aria-label="Infos Drone Alpha">ℹ</button>
            </div>
            <p class="drone-meta">Drone niveau ${alpha.maxLevel} • Niveau actuel : ${alpha.level} / ${alpha.maxLevel}</p>
            <p>Cadence actuelle : ${currentCadence}ms • Performances maximales</p>
            <div class="price">Niveau maximum atteint</div>
            <button class="equip-btn equipped">MAX</button>
        </div>`;
    }

    dronesContainer.innerHTML += `
        <div class="garage-card drone-card locked-card">
            <div class="card-head">
                <h3>Drone Beta</h3>
                <button class="info-btn" onclick="showDroneInfo('beta')" aria-label="Infos Drone Beta">ℹ</button>
            </div>
            <p class="drone-meta">Drone niveau 1 • Statut : verrouillé</p>
            <p class="locked-note">🔒 Prochaine mise à jour</p>
            <div class="price">Indisponible</div>
            <button class="equip-btn equipped">Bloqué</button>
        </div>
        <div class="garage-card drone-card locked-card">
            <div class="card-head">
                <h3>Drone Gamma</h3>
                <button class="info-btn" onclick="showDroneInfo('gamma')" aria-label="Infos Drone Gamma">ℹ</button>
            </div>
            <p class="drone-meta">Drone niveau 1 • Statut : verrouillé</p>
            <p class="locked-note">🔒 Prochaine mise à jour</p>
            <div class="price">Indisponible</div>
            <button class="equip-btn equipped">Bloqué</button>
        </div>`;

    const overclockOwned = Boolean(profile.garageUnlocks?.droneOverclock);
    const haloOwned = Boolean(profile.garageUnlocks?.haloCosmique);

    const equippedShipId = typeof profile.equippedShip === "string" && profile.equippedShip.trim()
        ? profile.equippedShip.trim()
        : "vaisseau1";
    const ownedShips = Array.isArray(profile.ownedShips) ? profile.ownedShips : ["vaisseau1"];
    const shipChoicesHtml = SHIP_CATALOG.map((ship) => {
        const owned = ownedShips.includes(ship.id);
        const equipped = ship.id === equippedShipId;
        const canBuy = Number.isFinite(ship.price) && ship.price > 0;

        return `
            <article class="ship-choice-card ${equipped ? "is-equipped" : ""} ${owned ? "" : "is-locked"}">
                <div class="ship-choice-preview">
                    <img src="${ship.asset}" alt="${ship.name}" loading="lazy" onerror="this.onerror=null;this.src='assets/vaisseau/vaisseau1.png';">
                </div>
                <strong>${ship.name}</strong>
                <span>${owned ? "Possédé" : `${ship.status}${canBuy ? ` • ${ship.price} crédits` : ""}`}</span>
                ${owned
                    ? (equipped
                        ? `<button class="equip-btn equipped">Équipé</button>`
                        : `<button class="equip-btn" onclick="equipShip('${ship.id}')">Équiper</button>`)
                    : (canBuy
                        ? `<button class="buy-btn" onclick="buyShip('${ship.id}')">Débloquer</button>`
                        : `<button class="equip-btn equipped">Bloqué</button>`)}
            </article>
        `;
    }).join("");

    const equippedShipMeta = getShipFromCatalog(equippedShipId);
    const equippedShipName = equippedShipMeta?.name || "Nocturne Mk-I";
    const equippedModuleLabel = profile.equippedModule || "Aucun";
    const equippedDroneLabel = profile.drones.alpha.unlocked ? `alpha niv ${profile.drones.alpha.level}` : "Aucun";

    shipContainer.innerHTML = `<h2>Vaisseau</h2>
        <div class="garage-card ship-visual-card">
            <div class="card-head">
                <h3>Vaisseau équipé</h3>
                <span class="ship-tag ship-tag-active">ACTIF</span>
            </div>

            <div class="ship-preview">
                <img src="assets/vaisseau/${equippedShipId}.png" alt="Vaisseau équipé" loading="lazy" onerror="this.onerror=null;this.src='assets/vaisseau/vaisseau1.png';">
            </div>

            <p class="drone-meta">Modèle : ${equippedShipName} (${equippedShipId})</p>
            <p>Emplacement principal actif. La structure est prête pour ajouter d'autres vaisseaux.</p>

            <div class="ship-mini-stats">
                <div class="ship-stat">
                    <span>Module équipé</span>
                    <strong>${equippedModuleLabel}</strong>
                </div>
                <div class="ship-stat">
                    <span>Drone équipé</span>
                    <strong>${equippedDroneLabel}</strong>
                </div>
            </div>

            <div class="ship-slot-grid">
                <div class="ship-slot-card is-equipped">
                    <strong>Emplacement 1</strong>
                    <span>${equippedShipName} • équipé</span>
                </div>
            </div>
        </div>

        <div class="garage-card ship-hangar-card">
            <div class="card-head">
                <h3>Hangar vaisseaux</h3>
                <span class="ship-tag">Préparation flotte</span>
            </div>
            <p>Sélection prête pour les prochains modèles. Ajoute juste les images dans <strong>assets/vaisseau/</strong>.</p>
            <div class="ship-choice-grid">
                ${shipChoicesHtml}
            </div>
        </div>

        <div class="garage-card drone-card ship-upgrade-card">
            <div class="card-head">
                <h3>Drone Alpha Overclock</h3>
                <button class="info-btn" onclick="showPopup('Overclock', 'Réduit le cooldown des drones en combat. Upgrade endgame.')" aria-label="Infos Overclock">ℹ</button>
            </div>
            <p class="drone-meta">Upgrade endgame</p>
            <p>Effet : cadence drone améliorée en permanence.</p>
            <div class="price">15000 crédits</div>
            ${overclockOwned
                ? `<button class="equip-btn equipped">Débloqué</button>`
                : `<button class="buy-btn" onclick="buyEndgameUpgrade('droneOverclock', 15000)">Débloquer</button>`}
        </div>

        <div class="garage-card drone-card ship-upgrade-card">
            <div class="card-head">
                <h3>Halo cosmique</h3>
                <button class="info-btn" onclick="showPopup('Halo cosmique', 'Accorde une vie supplémentaire au départ des runs.')" aria-label="Infos Halo cosmique">ℹ</button>
            </div>
            <p class="drone-meta">Upgrade endgame</p>
            <p>Effet : +1 vie au début de partie.</p>
            <div class="price">8000 crédits</div>
            ${haloOwned
                ? `<button class="equip-btn equipped">Débloqué</button>`
                : `<button class="buy-btn" onclick="buyEndgameUpgrade('haloCosmique', 8000)">Débloquer</button>`}
        </div>`;
}
// Système simple d'achat et d'équipement pour le garage

// Modules et drones disponibles à l'achat
const shopModules = getShopModulesFromCatalog(profile?.moduleCatalog);
function buyItem(type, id, price) {

    if (profile.credits < price) {
        showPopup("Crédits insuffisants", "Tu n'as pas assez de crédits lumineux.");
        return;
    }

    profile.credits -= price;

    if (type === "module") {
        if (!profile.ownedModules.includes(id)) {
            profile.ownedModules.push(id);
        }
    }

    saveProfile({ showHardcoreMessage: true });
    updateCreditsDisplay();
    renderShop();
}

function equipItem(type, id) {
    if (type === "module" && profile.ownedModules.includes(id)) {
        profile.equippedModule = id;
    }
    saveProfile({ showHardcoreMessage: true });
    renderShop();
}

function equipShip(shipId) {
    const normalizedShipId = normalizeShipId(shipId);
    if (!normalizedShipId) {
        showPopup("Vaisseau invalide", "Impossible d'équiper ce vaisseau.");
        return;
    }

    const ownedShips = Array.isArray(profile.ownedShips) ? profile.ownedShips : [];
    if (!ownedShips.includes(normalizedShipId)) {
        showPopup("Vaisseau verrouillé", "Ce vaisseau n'est pas encore débloqué.");
        return;
    }

    profile.equippedShip = normalizedShipId;
    saveProfile({ showHardcoreMessage: true });
    renderShop();
}

function buyShip(shipId) {
    const normalizedShipId = normalizeShipId(shipId);
    if (!normalizedShipId) {
        showPopup("Vaisseau invalide", "Impossible de débloquer ce vaisseau.");
        return;
    }

    const shipMeta = getShipFromCatalog(normalizedShipId);
    if (!shipMeta) {
        showPopup("Vaisseau introuvable", "Ce vaisseau n'existe pas dans le hangar.");
        return;
    }

    if (!Array.isArray(profile.ownedShips)) {
        profile.ownedShips = ["vaisseau1"];
    }

    if (profile.ownedShips.includes(normalizedShipId)) {
        showPopup("Déjà débloqué", `${shipMeta.name} est déjà disponible.`);
        return;
    }

    const price = Number.isFinite(shipMeta.price) ? shipMeta.price : 0;
    if (price > 0 && profile.credits < price) {
        showPopup("Crédits insuffisants", `Il faut ${price} crédits pour débloquer ${shipMeta.name}.`);
        return;
    }

    profile.credits -= Math.max(0, price);
    profile.ownedShips.push(normalizedShipId);
    profile.ownedShips = [...new Set(profile.ownedShips.map(normalizeShipId).filter(Boolean))];
    profile.equippedShip = normalizedShipId;

    saveProfile({ showHardcoreMessage: true });
    updateCreditsDisplay();
    renderShop();
}

function buyDroneAlpha() {
    const drone = profile.drones.alpha;
    if (drone.unlocked) {
        showPopup("Déjà débloqué", "Le Drone Alpha est déjà disponible.");
        return;
    }

    if (profile.credits < 500) {
        showPopup("Crédits insuffisants", "Il faut 500 crédits pour acheter le Drone Alpha.");
        return;
    }

    profile.credits -= 500;
    drone.unlocked = true;
    drone.level = 1;
    profile.ownedDrones = ["drone1"];
    profile.equippedDrone = "alpha";

    saveProfile({ showHardcoreMessage: true });
    updateCreditsDisplay();
    renderShop();
}

function upgradeDroneAlpha() {
    const drone = profile.drones.alpha;
    if (!drone.unlocked) {
        showPopup("Drone verrouillé", "Achète d'abord le Drone Alpha.");
        return;
    }

    if (drone.level >= drone.maxLevel) {
        showPopup("Niveau max", "Le Drone Alpha est déjà au niveau maximum.");
        return;
    }

    const cost = getDroneUpgradeCost(drone.level);
    if (profile.credits < cost) {
        showPopup("Crédits insuffisants", `Il faut ${cost} crédits pour améliorer ce drone.`);
        return;
    }

    profile.credits -= cost;
    drone.level += 1;
    profile.ownedDrones = [`drone${drone.level}`];
    profile.equippedDrone = "alpha";

    saveProfile({ showHardcoreMessage: true });
    updateCreditsDisplay();
    renderShop();
}

function buyEndgameUpgrade(upgradeId, cost) {
    if (!profile.garageUnlocks) {
        profile.garageUnlocks = {
            droneOverclock: false,
            haloCosmique: false
        };
    }

    if (profile.garageUnlocks[upgradeId]) {
        showPopup("Déjà débloqué", "Cet upgrade est déjà actif.");
        return;
    }

    if (profile.credits < cost) {
        showPopup("Crédits insuffisants", `Il faut ${cost} crédits pour cet upgrade.`);
        return;
    }

    profile.credits -= cost;
    profile.garageUnlocks[upgradeId] = true;

    saveProfile({ showHardcoreMessage: true });
    updateCreditsDisplay();
    renderShop();
}

updateCreditsDisplay();
const droneLayer = document.getElementById("drone-layer");
const radius = 130;
let orbitDrones = [];

function showDroneRing(){
    if (!droneLayer) return;
    droneLayer.innerHTML = "";

    const ring = document.createElement("div");
    ring.classList.add("drone-ring");
    ring.style.left = "0px";
    ring.style.top = "0px";

    ring.addEventListener("click", (e)=>{
        placeDrone(e, ring);
    });

    droneLayer.appendChild(ring);
}

function placeDrone(e, ring){
    const rect = ring.getBoundingClientRect();
    const centerX = rect.left + rect.width/2;
    const centerY = rect.top + rect.height/2;

    const angle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
    );

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    createWave();
    createDrone(x, y);
}

function createWave(){
    if (!droneLayer) return;
    const wave = document.createElement("div");
    wave.classList.add("ring-wave");
    wave.style.left = "0px";
    wave.style.top = "0px";
    droneLayer.appendChild(wave);

    setTimeout(()=>{
        wave.remove();
    },600);
}


function createDrone(x, y) {
    if (!droneLayer) return;
    const angle = Math.atan2(y, x);
    const drone = {
        el: document.createElement("div"),
        angle: angle,
        radius: radius,
        speed: 0.01 + Math.random() * 0.005
    };
    drone.el.classList.add("drone");
    droneLayer.appendChild(drone.el);
    orbitDrones.push(drone);
}

function updateDrones() {
    if (!droneLayer) return;
    orbitDrones.forEach(drone => {
        drone.angle += drone.speed;
        const x = Math.cos(drone.angle) * drone.radius;
        const y = Math.sin(drone.angle) * drone.radius;
        drone.el.style.left = `${x}px`;
        drone.el.style.top = `${y}px`;
    });
    requestAnimationFrame(updateDrones);
}

updateDrones();

document.addEventListener('DOMContentLoaded', () => {
    const backToMenuBtn = document.getElementById("backToMenu");
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener("click", () => {
            window.location.href = "menu.html";
        });
    }

    const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
    const tabContents = Array.from(document.querySelectorAll(".tab-content"));

    function hideDroneLayer() {
        if (droneLayer) {
            droneLayer.innerHTML = "";
        }
    }

    function setActiveTab(tabName) {
        tabButtons.forEach((btn) => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-expanded", String(isActive));
        });

        tabContents.forEach((content) => {
            content.classList.toggle("active", content.id === tabName);
        });

        if (tabName === "ship") {
            showDroneRing();
            return;
        }

        hideDroneLayer();
    }

    tabButtons.forEach((button) => {
        button.setAttribute("aria-expanded", String(button.classList.contains("active")));

        button.addEventListener("click", () => {
            const tab = button.dataset.tab;
            const isAlreadyActive = button.classList.contains("active");
            setActiveTab(isAlreadyActive ? null : tab);
        });
    });

    renderShop();

    const initiallyActiveTab = tabButtons.find((btn) => btn.classList.contains("active"))?.dataset.tab || null;
    setActiveTab(initiallyActiveTab);

    const popupBtn = document.getElementById("nv-popup-btn");
    if (popupBtn) {
        popupBtn.addEventListener("click", () => {
            const popup = document.getElementById("nv-popup");
            if (popup) {
                popup.classList.remove("active");
            }
        });
    }
});
