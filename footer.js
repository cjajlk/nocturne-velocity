const GAME_VERSION = "0.3.2";
window.GAME_VERSION = GAME_VERSION;

(function initializeGameFooter() {
    const placeholders = document.querySelectorAll("[data-game-footer]");
    if (!placeholders.length) return;

    placeholders.forEach((placeholder) => {
        const variant = placeholder.getAttribute("data-footer-variant");
        const footer = document.createElement("div");
        footer.className = variant === "inline" ? "game-footer footer-inline" : "game-footer";
        footer.innerHTML = `
            <span class="version">v${GAME_VERSION} – Nocturne Velocity</span>
            <span class="rights">© 2026 CJajlkGames – Tous droits réservés</span>
        `;
        placeholder.replaceWith(footer);
    });
})();