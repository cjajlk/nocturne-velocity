(function () {
  const overlay = document.getElementById("optionsOverlay");
  const closeBtn = document.getElementById("closeOptionsBtn");
  const triggerBtn = document.getElementById("optionsTrigger");
  let lastFocusedElement = null;

  function isElementInsideOverlay(element) {
    return Boolean(overlay && element && overlay.contains(element));
  }

  function moveFocusOutsideOverlay() {
    if (!overlay) return;

    if (isElementInsideOverlay(document.activeElement)) {
      if (triggerBtn && typeof triggerBtn.focus === "function") {
        triggerBtn.focus();
      } else {
        document.body.focus();
      }
    }
  }

  function openOptionsOverlay() {
    if (!overlay) return;
    if (typeof window.initializeOptionsPanel === "function") {
      window.initializeOptionsPanel();
    }

    lastFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    overlay.classList.add("active");
    overlay.removeAttribute("inert");
    overlay.setAttribute("aria-hidden", "false");

    if (closeBtn && typeof closeBtn.focus === "function") {
      closeBtn.focus();
    }
  }

  function closeOptionsOverlay() {
    if (!overlay) return;
    moveFocusOutsideOverlay();
    overlay.classList.remove("active");
    overlay.setAttribute("inert", "");
    overlay.setAttribute("aria-hidden", "true");

    if (lastFocusedElement && !isElementInsideOverlay(lastFocusedElement) && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    } else if (triggerBtn && typeof triggerBtn.focus === "function") {
      triggerBtn.focus();
    }
  }

  if (overlay) {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeOptionsOverlay();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeOptionsOverlay);
  }

  if (triggerBtn) {
    triggerBtn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openOptionsOverlay();
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay && overlay.classList.contains("active")) {
      closeOptionsOverlay();
    }
  });

  window.openOptionsOverlay = openOptionsOverlay;
  window.closeOptionsOverlay = closeOptionsOverlay;
})();
