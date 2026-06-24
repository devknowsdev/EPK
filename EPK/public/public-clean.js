(function cleanPublicChrome() {
    const style = document.createElement('style');
    style.id = 'epk-public-clean-chrome';
    style.textContent = `
        .site-bar,
        [data-epk-section="utility"] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    function removeToolbar() {
        document
            .querySelectorAll('.site-bar, [data-epk-section="utility"]')
            .forEach(element => element.remove());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeToolbar, { once: true });
    } else {
        removeToolbar();
    }

    const observer = new MutationObserver(removeToolbar);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
}());
