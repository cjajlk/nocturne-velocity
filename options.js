(function () {
  const STORAGE_KEYS = {
    audio: "nv_options_audio",
    graphics: "nv_options_graphics",
    gameplay: "nv_options_gameplay",
    ui: "nv_options_ui"
  };

  const DEFAULTS = {
    audio: {
      masterVolume: 100,
      musicVolume: 75,
      sfxVolume: 85,
      muteAll: false,
      spatialAudio: true
    },
    graphics: {
      brightness: 100,
      contrast: 100,
      particles: true,
      screenShake: true,
      fpsLimit: 60
    },
    gameplay: {
      aimAssist: 20,
      autoFireTouch: true,
      vibration: false,
      combatSpeed: 100
    },
    ui: {
      hudScale: 100,
      textScale: 100,
      damageNumbers: true,
      colorBlindMode: false
    }
  };

  let optionsState = null;

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function loadGroup(groupName) {
    const defaults = DEFAULTS[groupName];
    const raw = localStorage.getItem(STORAGE_KEYS[groupName]);
    const parsed = raw ? safeParse(raw) : null;
    if (!parsed || typeof parsed !== "object") {
      return { ...defaults };
    }
    return { ...defaults, ...parsed };
  }

  function saveGroup(groupName) {
    if (!optionsState) return;
    localStorage.setItem(STORAGE_KEYS[groupName], JSON.stringify(optionsState[groupName]));
  }

  function initializeState() {
    optionsState = {
      audio: loadGroup("audio"),
      graphics: loadGroup("graphics"),
      gameplay: loadGroup("gameplay"),
      ui: loadGroup("ui")
    };
  }

  function initGenericTabs(rootElement) {
    if (!rootElement) return;

    const buttons = Array.from(rootElement.querySelectorAll(".tab-btn[data-tab]"));
    const panels = Array.from(document.querySelectorAll(".options-panels .tab-panel"));

    const activate = (tabName) => {
      buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
      panels.forEach((panel) => panel.classList.toggle("active", panel.id === `options-${tabName}`));
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        activate(btn.dataset.tab);
      });
    });
  }

  function renderToggle(button, enabled) {
    if (!button) return;
    button.classList.toggle("is-on", Boolean(enabled));
    button.setAttribute("aria-pressed", String(Boolean(enabled)));
    button.textContent = enabled ? "ON" : "OFF";
  }

  function bindSlider(groupName, key, inputId, valueId, format) {
    const input = document.getElementById(inputId);
    const valueEl = document.getElementById(valueId);
    if (!input || !valueEl) return;

    const current = Number(optionsState[groupName][key]);
    input.value = Number.isFinite(current) ? String(current) : String(DEFAULTS[groupName][key]);

    const updateValue = () => {
      const numeric = Number(input.value);
      optionsState[groupName][key] = numeric;
      valueEl.textContent = format ? format(numeric) : String(numeric);
      saveGroup(groupName);
    };

    updateValue();
    input.addEventListener("input", updateValue);
    input.addEventListener("change", updateValue);
  }

  function bindToggle(groupName, key, buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    const sync = () => {
      renderToggle(button, Boolean(optionsState[groupName][key]));
      saveGroup(groupName);
    };

    sync();

    button.addEventListener("click", () => {
      optionsState[groupName][key] = !Boolean(optionsState[groupName][key]);
      sync();
    });
  }

  function bindAllControls() {
    bindSlider("audio", "masterVolume", "audio-masterVolume", "audio-masterVolume-value", (v) => `${v}%`);
    bindSlider("audio", "musicVolume", "audio-musicVolume", "audio-musicVolume-value", (v) => `${v}%`);
    bindSlider("audio", "sfxVolume", "audio-sfxVolume", "audio-sfxVolume-value", (v) => `${v}%`);
    bindToggle("audio", "muteAll", "audio-muteAll");
    bindToggle("audio", "spatialAudio", "audio-spatialAudio");

    bindSlider("graphics", "brightness", "graphics-brightness", "graphics-brightness-value", (v) => `${v}%`);
    bindSlider("graphics", "contrast", "graphics-contrast", "graphics-contrast-value", (v) => `${v}%`);
    bindSlider("graphics", "fpsLimit", "graphics-fpsLimit", "graphics-fpsLimit-value", (v) => `${v}`);
    bindToggle("graphics", "particles", "graphics-particles");
    bindToggle("graphics", "screenShake", "graphics-screenShake");

    bindSlider("gameplay", "aimAssist", "gameplay-aimAssist", "gameplay-aimAssist-value", (v) => `${v}%`);
    bindSlider("gameplay", "combatSpeed", "gameplay-combatSpeed", "gameplay-combatSpeed-value", (v) => `${v}%`);
    bindToggle("gameplay", "autoFireTouch", "gameplay-autoFireTouch");
    bindToggle("gameplay", "vibration", "gameplay-vibration");

    bindSlider("ui", "hudScale", "ui-hudScale", "ui-hudScale-value", (v) => `${v}%`);
    bindSlider("ui", "textScale", "ui-textScale", "ui-textScale-value", (v) => `${v}%`);
    bindToggle("ui", "damageNumbers", "ui-damageNumbers");
    bindToggle("ui", "colorBlindMode", "ui-colorBlindMode");
  }

  let initialized = false;

  function initializeOptionsPanel() {
    if (initialized) return;
    initializeState();

    const tabsRoot = document.getElementById("optionsTabs");
    initGenericTabs(tabsRoot);
    bindAllControls();

    initialized = true;
  }

  window.initGenericTabs = initGenericTabs;
  window.initializeOptionsPanel = initializeOptionsPanel;
})();
