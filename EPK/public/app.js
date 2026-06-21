let epk = null;
let mode = null;

async function init() {
    const res = await fetch('data/epk.json');
    epk = await res.json();

    // Detect mode from ?for=X query param
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('for') || 'default';
    mode = epk.modes[requested] || epk.modes['default'];

    document.title = `${epk.meta.name} — ${mode.label}`;
    document.getElementById("app").innerHTML = renderPage();
}

function renderPage() {
    const parts = [renderHero()];

    const wrapOpen  = `<div class="content">`;
    const wrapClose = `</div>`;

    mode.sections.forEach(section => {
        switch (section) {
            case "bio":
                parts.push(wrapOpen + renderBio() + wrapClose);
                break;
            case "offerings":
                const offers = epk.offerings.filter(o =>
                    mode.offeringTags.length === 0 ||
                    o.tags.some(t => mode.offeringTags.includes(t))
                );
                if (offers.length) parts.push(wrapOpen + renderOfferings(offers) + wrapClose);
                break;
            case "credits":
                const credits = epk.credits.filter(c =>
                    c.tags.some(t => ["film","press"].includes(t))
                );
                if (credits.length) parts.push(wrapOpen + renderCredits(credits) + wrapClose);
                break;
            case "videos":
                const videos = epk.videos.filter(v =>
                    mode.videoTags.length === 0 ||
                    v.tags.some(t => mode.videoTags.includes(t))
                );
                if (videos.length) parts.push(wrapOpen + renderVideos(videos) + wrapClose);
                break;
            case "releases":
                if (epk.releases.length) parts.push(wrapOpen + renderReleases() + wrapClose);
                break;
            case "gallery":
                if (mode.galleryCount > 0) {
                    const photos = epk.gallery.slice(0, mode.galleryCount);
                    parts.push(wrapOpen + renderGallery(photos) + wrapClose);
                }
                break;
            case "contact":
                parts.push(wrapOpen + renderContact() + wrapClose);
                break;
        }
    });

    parts.push(renderFooter());
    return parts.join("");
}

// ── Hero ──────────────────────────────────────────────────────────
function renderHero() {
    return `
    <section class="hero">
        <img class="hero__img" src="${mode.hero}" alt="${epk.meta.name}">
        <div class="hero__overlay">
            <hr class="hero__rule">
            <h1 class="hero__name">${epk.meta.name}</h1>
            <hr class="hero__rule">
            <p class="hero__tagline">${epk.meta.tagline}</p>
        </div>
        ${mode.heroCaption ? `<p class="hero__caption">${mode.heroCaption}</p>` : ""}
    </section>`;
}

// ── Bio ───────────────────────────────────────────────────────────
function renderBio() {
    const style = mode.bioStyle || 'short';
    const bio = epk.bio;

    let html = '';
    if (style === 'full') {
        html = bio.full.map(p => `<p>${p}</p>`).join('');
    } else if (style === 'acoustic') {
        html = `<p>${bio.acoustic}</p>`;
    } else {
        html = `<p>${bio.short}</p>`;
    }

    return `
    <section class="epk-section">
        <p class="section-label">Biography</p>
        <div class="bio-text">${html}</div>
    </section>`;
}

// ── Offerings ─────────────────────────────────────────────────────
function renderOfferings(offers) {
    return `
    <section class="epk-section">
        <p class="section-label">Offerings</p>
        <div class="offerings-grid">
            ${offers.map(o => `
                <div class="offering-card">
                    <h3>${o.title}</h3>
                    <p>${o.description}</p>
                </div>
            `).join('')}
        </div>
    </section>`;
}

// ── Credits ───────────────────────────────────────────────────────
function renderCredits(credits) {
    return `
    <section class="epk-section">
        <p class="section-label">Selected Credits</p>
        <div class="credits-list">
            ${credits.map(c => `
                <div class="credit-row">
                    <div class="credit-meta">
                        <span class="credit-year">${c.year}</span>
                        <span class="credit-role">${c.role}</span>
                    </div>
                    <div class="credit-body">
                        <h3>${c.link ? `<a href="${c.link}" target="_blank" rel="noopener">${c.title}</a>` : c.title}</h3>
                        <p>${c.description}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    </section>`;
}

// ── Videos ───────────────────────────────────────────────────────
function renderVideos(videos) {
    return `
    <section class="epk-section">
        <p class="section-label">Videos</p>
        <div class="video-list">
            ${videos.map(v => `
                <a class="video-link" href="${v.url}" target="_blank" rel="noopener">
                    <span class="play-icon">▶</span>
                    ${v.title}
                </a>
            `).join('')}
        </div>
    </section>`;
}

// ── Releases ──────────────────────────────────────────────────────
function renderReleases() {
    return `
    <section class="epk-section">
        <p class="section-label">Selected Releases</p>
        <div class="video-list">
            ${epk.releases.map(r => `
                <a class="video-link" href="${r.url}" target="_blank" rel="noopener">
                    <span class="play-icon">♪</span>
                    ${r.title} ${r.alias ? `<span class="release-alias">— ${r.alias}</span>` : ''}
                </a>
            `).join('')}
        </div>
    </section>`;
}

// ── Gallery ───────────────────────────────────────────────────────
function renderGallery(photos) {
    return `
    <section class="epk-section">
        <p class="section-label">Photos</p>
        <div class="gallery-grid">
            ${photos.map(g => `<img src="${g.src}" alt="${g.caption || 'Dave Knowles'}" title="${g.caption || ''}">`).join('')}
        </div>
        <a class="gallery-more" href="gallery.html">View all photos →</a>
    </section>`;
}

// ── Contact ───────────────────────────────────────────────────────
function renderContact() {
    const m = epk.meta;
    return `
    <section class="epk-section">
        <p class="section-label">Contact</p>
        <div class="contact-block">
            <div class="contact-item">Email: <a href="mailto:${m.email}">${m.email}</a></div>
            <div class="contact-item">Phone: <a href="tel:${m.phone.replace(/\s/g,'')}">${m.phone}</a></div>
            <div class="contact-item">Web: <a href="${m.website}" target="_blank" rel="noopener">${m.website.replace('https://','')}</a></div>
        </div>
        <div class="social-row">
            <a class="social-link" href="${m.social.instagram}" target="_blank" rel="noopener">Instagram</a>
            <a class="social-link" href="${m.social.youtube}" target="_blank" rel="noopener">YouTube</a>
            <a class="social-link" href="${m.social.soundcloud}" target="_blank" rel="noopener">SoundCloud</a>
            <a class="social-link" href="${m.social.facebook}" target="_blank" rel="noopener">Facebook</a>
        </div>
    </section>`;
}

// ── Footer ────────────────────────────────────────────────────────
function renderFooter() {
    return `<footer>© ${new Date().getFullYear()} ${epk.meta.name} · ${epk.meta.location}</footer>`;
}

init();
