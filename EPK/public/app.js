let epk = null;
let mode = null;
let modeKey = 'default';

async function init() {
    const res = await fetch('data/epk.json');
    epk = await res.json();

    const params = new URLSearchParams(window.location.search);
    const requested = params.get('for') || 'default';
    modeKey = epk.modes?.[requested] ? requested : 'default';
    mode = getMode(modeKey);

    document.body.dataset.epkMode = modeKey;
    document.body.dataset.epkPage = 'index';

    installAdapter();
    injectStructuredData();

    document.title = `${epk.meta.name} — ${mode.label}`;
    document.getElementById('app').innerHTML = renderPage();
}

function getMode(key) {
    return epk?.modes?.[key] || epk?.modes?.default || null;
}

function installAdapter() {
    window.EPKAdapter = {
        version: '1.1.0',
        getData: () => structuredClone(epk),
        getModes: () => structuredClone(epk?.modes || {}),
        getMode: key => structuredClone(getMode(key)),
        getActiveMode: () => structuredClone(mode),
        getStructuredData: () => structuredClone(buildStructuredData()),
        getCreativeBrief: overrides => structuredClone(buildCreativeBrief(overrides || {})),
        buildGigPromoBrief: event => structuredClone(buildGigPromoBrief(event || {}))
    };

    window.EPK_SITE = {
        name: epk.meta.name,
        mode: modeKey,
        href: window.location.href
    };
}

function injectStructuredData() {
    const existing = document.getElementById('epk-structured-data');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'epk-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(buildStructuredData(), null, 2);
    document.head.appendChild(script);

    const meta = document.createElement('meta');
    meta.name = 'epk:mode';
    meta.content = modeKey;
    document.head.appendChild(meta);
}

function buildStructuredData() {
    const socialLinks = Object.values(epk.meta.social || {}).filter(Boolean);
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: epk.meta.name,
        jobTitle: epk.meta.tagline,
        address: epk.meta.location,
        url: epk.meta.website,
        sameAs: socialLinks,
        image: mode?.hero ? new URL(mode.hero, window.location.href).toString() : undefined,
        description: epk.bio?.short || epk.meta.tagline,
        knowsAbout: (epk.offerings || []).map(o => o.title).filter(Boolean)
    };
}

function buildCreativeBrief(overrides = {}) {
    const active = overrides.mode ? getMode(overrides.mode) : (overrides.modeObject || mode);
    return {
        artist: epk.meta.name,
        project: epk.meta.tagline,
        audience: overrides.audience || active?.label || 'General',
        mode: {
            key: modeKey,
            label: active?.label || mode?.label || 'General'
        },
        event: {
            name: overrides.eventName || '',
            date: overrides.date || '',
            venue: overrides.venue || '',
            city: overrides.city || '',
            cta: overrides.cta || ''
        },
        tone: overrides.tone || 'editorial and concise',
        outputs: overrides.outputs || [
            'poster copy',
            'instagram caption',
            'story copy',
            'facebook event blurb'
        ],
        assets: {
            heroImage: active?.hero || '',
            heroCaption: active?.heroCaption || '',
            gallery: (epk.gallery || []).slice(0, 6),
            videos: (epk.videos || []).slice(0, 4),
            releases: epk.releases || []
        },
        source: {
            site: 'EPK',
            contract: 'window.EPKAdapter'
        },
        contact: {
            email: epk.meta.email,
            phone: epk.meta.phone,
            website: epk.meta.website,
            social: epk.meta.social
        },
        notes: [
            'Use the active mode before falling back to default.',
            'Do not invent credits, dates, venues, or media links.',
            'Treat public/data/epk.json as the source of truth.'
        ]
    };
}

function buildGigPromoBrief(event = {}) {
    const brief = buildCreativeBrief({
        ...event,
        audience: event.audience || 'club promoters and social audiences',
        tone: event.tone || 'slick club electronic'
    });

    return {
        ...brief,
        template: 'gigPromo',
        requiredInputs: ['eventName', 'date', 'venue', 'city'],
        outputs: event.outputs || brief.outputs
    };
}

function renderPage() {
    const parts = [renderTopBar(), renderHero()];
    const wrapOpen = `<div class="content">`;
    const wrapClose = `</div>`;

    mode.sections.forEach(section => {
        switch (section) {
            case 'bio':
                parts.push(wrapOpen + renderBio() + wrapClose);
                break;
            case 'offerings':
                const offers = epk.offerings.filter(o =>
                    mode.offeringTags.length === 0 ||
                    o.tags.some(t => mode.offeringTags.includes(t))
                );
                if (offers.length) parts.push(wrapOpen + renderOfferings(offers) + wrapClose);
                break;
            case 'credits':
                const credits = epk.credits.filter(c =>
                    c.tags.some(t => ['film', 'press'].includes(t))
                );
                if (credits.length) parts.push(wrapOpen + renderCredits(credits) + wrapClose);
                break;
            case 'videos':
                const videos = epk.videos.filter(v =>
                    mode.videoTags.length === 0 ||
                    v.tags.some(t => mode.videoTags.includes(t))
                );
                if (videos.length) parts.push(wrapOpen + renderVideos(videos) + wrapClose);
                break;
            case 'releases':
                if (epk.releases.length) parts.push(wrapOpen + renderReleases() + wrapClose);
                break;
            case 'gallery':
                if (mode.galleryCount > 0) {
                    const photos = epk.gallery.slice(0, mode.galleryCount);
                    parts.push(wrapOpen + renderGallery(photos) + wrapClose);
                }
                break;
            case 'contact':
                parts.push(wrapOpen + renderContact() + wrapClose);
                break;
        }
    });

    parts.push(renderFooter());
    return parts.join('');
}

function renderTopBar() {
    return `
    <header class="site-bar" data-ai-surface="spectra" data-epk-section="utility">
        <div class="site-bar__brand">
            <a class="site-bar__home" href="index.html">${epk.meta.name}</a>
            <span class="site-bar__mode">${mode.label} view</span>
        </div>
        <nav class="site-bar__nav" aria-label="Audience modes">
            ${renderModeLinks()}
        </nav>
        <div class="site-bar__actions">
            <a class="site-bar__action" href="gallery.html">Gallery</a>
            <a class="site-bar__action" href="admin.html">Admin</a>
        </div>
    </header>`;
}

function renderModeLinks() {
    return Object.entries(epk.modes || {}).map(([key, item]) => {
        const href = key === 'default' ? 'index.html' : `index.html?for=${key}`;
        const active = key === modeKey ? ' is-active' : '';
        const current = key === modeKey ? ' aria-current="page"' : '';
        return `<a class="site-bar__chip${active}" href="${href}"${current}>${item.label}</a>`;
    }).join('');
}

// ── Hero ──────────────────────────────────────────────────────────
function renderHero() {
    return `
    <section class="hero" data-epk-section="hero" data-epk-mode="${modeKey}">
        <img class="hero__img" src="${mode.hero}" alt="${epk.meta.name}">
        <div class="hero__overlay">
            <hr class="hero__rule">
            <h1 class="hero__name">${epk.meta.name}</h1>
            <hr class="hero__rule">
            <p class="hero__tagline">${epk.meta.tagline}</p>
        </div>
        ${mode.heroCaption ? `<p class="hero__caption">${mode.heroCaption}</p>` : ''}
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
    <section class="epk-section" data-epk-section="bio">
        <p class="section-label">Biography</p>
        <div class="bio-text">${html}</div>
    </section>`;
}

// ── Offerings ─────────────────────────────────────────────────────
function renderOfferings(offers) {
    return `
    <section class="epk-section" data-epk-section="offerings">
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
    <section class="epk-section" data-epk-section="credits">
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
    <section class="epk-section" data-epk-section="videos">
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
    <section class="epk-section" data-epk-section="releases">
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
    <section class="epk-section" data-epk-section="gallery">
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
    <section class="epk-section" data-epk-section="contact">
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
