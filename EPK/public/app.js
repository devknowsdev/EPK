let epk = null;

async function init() {
    const res = await fetch('data/epk.json');
    epk = await res.json();
    document.getElementById("app").innerHTML = render(epk);
}

function render(data) {
    const sections = data.layout.map(block => {
        const c = data.content[block.id];
        switch (block.type) {
            case "hero":     return renderHero(c);
            case "bio":      return renderBio(c);
            case "offerings": return renderOfferings(c);
            case "videos":   return renderVideos(c);
            case "gallery":  return renderGallery(c);
            case "contact":  return renderContact(c);
            default: return "";
        }
    }).join("");

    return sections + renderFooter(data.meta || {});
}

function renderHero(c) {
    return `
    <section class="hero">
        <img class="hero__img" src="${c.image}" alt="Dave Knowles">
        <div class="hero__overlay">
            <hr class="hero__rule">
            <h1 class="hero__name">Dave Knowles</h1>
            <hr class="hero__rule">
            <p class="hero__tagline">${c.tagline || "Composer · Multi-Instrumentalist · Cape Town"}</p>
        </div>
        ${c.caption ? `<p class="hero__caption">${c.caption}</p>` : ""}
    </section>`;
}

function renderBio(c) {
    return `
    <div class="content">
        <section class="epk-section">
            <p class="section-label">Biography</p>
            <div class="bio-text">
                ${c.map(p => `<p>${p}</p>`).join("")}
            </div>
        </section>
    </div>`;
}

function renderOfferings(c) {
    return `
    <div class="content">
        <section class="epk-section">
            <p class="section-label">Offerings</p>
            <div class="offerings-grid">
                ${c.map(o => `
                    <div class="offering-card">
                        <h3>${o.title}</h3>
                        <p>${o.description}</p>
                    </div>
                `).join("")}
            </div>
        </section>
    </div>`;
}

function renderVideos(c) {
    return `
    <div class="content">
        <section class="epk-section">
            <p class="section-label">Videos</p>
            <div class="video-list">
                ${c.map(v => `
                    <a class="video-link" href="${v.url}" target="_blank" rel="noopener">
                        <span class="play-icon">▶</span>
                        ${v.title}
                    </a>
                `).join("")}
            </div>
        </section>
    </div>`;
}

function renderGallery(c) {
    return `
    <div class="content">
        <section class="epk-section">
            <p class="section-label">Gallery</p>
            <div class="gallery-grid">
                ${c.map(g => `<img src="${g.src}" alt="Dave Knowles">`).join("")}
            </div>
            <a class="gallery-more" href="gallery.html">View full gallery →</a>
        </section>
    </div>`;
}

function renderContact(c) {
    return `
    <div class="content">
        <section class="epk-section">
            <p class="section-label">Contact</p>
            <div class="contact-block">
                ${c.map(item => `
                    <div class="contact-item">
                        ${item.label}: <a href="${item.href}">${item.value}</a>
                    </div>
                `).join("")}
            </div>
        </section>
    </div>`;
}

function renderFooter(meta) {
    return `<footer>© ${new Date().getFullYear()} Dave Knowles${meta.location ? " · " + meta.location : ""}</footer>`;
}

init();
