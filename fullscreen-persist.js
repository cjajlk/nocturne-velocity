(function () {
  const UI_OPTIONS_KEY = "nv_options_ui";

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function fullscreenWanted() {
    const raw = localStorage.getItem(UI_OPTIONS_KEY);
    const parsed = raw ? safeParse(raw) : null;
    return Boolean(parsed && parsed.fullscreen);
  }

  function isFullscreenActive() {
    return Boolean(document.fullscreenElement);
  }

  async function requestFullscreenIfNeeded() {
    if (!fullscreenWanted()) return;
    if (isFullscreenActive()) return;
    if (!document.documentElement.requestFullscreen) return;

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Ignore: browser requires user gesture or denies request.
    }
  }

  function bindReentryOnUserGesture() {
    const tryReenter = () => {
      requestFullscreenIfNeeded();
    };

    document.addEventListener("pointerdown", tryReenter, { passive: true });
    document.addEventListener("touchstart", tryReenter, { passive: true });
    document.addEventListener("keydown", tryReenter);
  }

  requestFullscreenIfNeeded();
  bindReentryOnUserGesture();
})();
