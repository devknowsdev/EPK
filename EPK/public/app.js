let epk = null;
let mode = null;
let modeKey = 'default';
let publishedId = '';
let isPublished = false;

const PUBLIC_ROUTE_TO_MODE = {
    '/venue': 'booker',
    '/booker': 'booker',
    '/acoustic': 'acoustic',
    '/press': 'press',
    '/film': 'film',
    '/duif': 'duif'
};

const MODE_TO_PUBLIC_ROUTE = {
    default: '/',
    booker: '/venue',
    acoustic: '/acoustic',
    press: '/press',
    film: '/film',
    duif: '/duif'
};

async function init() {
    const params = new URLSearchParams(window.location.search);
    publishedId = window.__EPK_PUBLISHED_ID__ || params.get('published') || '';
    isPublished = Boolean(publishedId);

    epk = await loadEPKData();

    const requested = resolveRequestedMode(params);
    modeKey = epk.modes?.[requested] ? requested : 'default';
    mode = getMode(modeKey);

    document.body.dataset.epkMode = modeKey;
    document.body.dataset.epkPage = isPublished ? 'published' : 'index';
    document.body.dataset.epkPublished = publishedId;

    installAdapter();
    injectBridgeStyles();
    injectStructuredData();

    document.title = isPublished
        ? `${epk.meta.name} — ${mode.label}`
        : `${epk.meta.name} — ${mode.label}`;
    document.getElementById('app').innerHTML = renderPage();
}

async function loadEPKData() {
    if (window.__EPK_SNAPSHOT__) {
        return structuredClone(window.__EPK_SNAPSHOT__);
    }

    const source = isPublished
        ? `/published/${publishedId}/epk.json`
        : '/data/epk.json';

    const res = await fetch(source);
    if (!res.ok) {
        throw new Error(`Failed to load EPK data from ${source}`);
    }
    return await res.json();
}

function getMode(key) {
    return epk?.modes?.[key] || epk?.modes?.default || null;
}

function resolveRequestedMode(params) {
    const previewMode = window.__EPK_PREVIEW_MODE__ || '';
    const legacyMode = previewMode || params.get('for') || 'default';
    if (isPublished) return legacyMode;

    return previewMode || modeFromPublicRoute(window.location.pathname) || legacyMode;
}

function modeFromPublicRoute(pathname) {
    const path = normalizePublicPath(pathname);
    return PUBLIC_ROUTE_TO_MODE[path] || '';
}

function normalizePublicPath(pathname) {
    const path = pathname.replace(/\/index\.html$/, '/') || '/';
    if (path === '/') return path;
    return path.replace(/\/+$/, '');
}

function publicRouteForMode(key) {
    return MODE_TO_PUBLIC_ROUTE[key] || '/';
}

function selectedForMode(items, key = modeKey) {
    return (items || []).filter(item => (item.tags || []).includes(key));
}

function installAdapter() {
    window.EPKAdapter = {
        version: '1.2.0',
        getData: () => structuredClone(epk),
        getModes: () => structuredClone(epk?.modes || {}),
        getMode: key => structuredClone(getMode(key)),
        getActiveMode: () => structuredClone(mode),
        getPublication: () => ({
            id: publishedId || null,
            isPublished,
            url: isPublished ? canonicalPageUrl() : null
        }),
        getStructuredData: () => structuredClone(buildStructuredData()),
        getCreativeBrief: overrides => structuredClone(buildCreativeBrief(overrides || {})),
        buildGigPromoBrief: event => structuredClone(buildGigPromoBrief(event || {}))
    };

    window.EPK_SITE = {
        name: epk.meta.name,
        mode: modeKey,
        published: isPublished,
        publicationId: publishedId || null,
        href: canonicalPageUrl()
    };
}

function injectBridgeStyles() {
    const existing = document.getElementById('epk-bridge-styles');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'epk-bridge-styles';
    style.textContent = `
        .site-bar {
            max-width: 1100px;
            margin: 0 auto;
            padding: 18px 32px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            border-bottom: 1px solid var(--rule);
            text-transform: uppercase;
            letter-spacing: 0.16em;
        }

        .site-bar__brand {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex-shrink: 0;
        }

        .site-bar__home {
            font-size: 0.74rem;
            color: var(--parchment);
            text-decoration: none;
        }

        .site-bar__home:hover {
            color: var(--brass);
        }

        .site-bar__mode {
            font-size: 0.62rem;
            color: var(--brass);
        }

        .site-bar__nav {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
        }

        .site-bar__chip,
        .site-bar__action {
            font-size: 0.62rem;
            color: var(--stone);
            text-decoration: none;
            border: 1px solid var(--rule);
            padding: 6px 10px;
            border-radius: 999px;
            transition: border-color 0.2s, color 0.2s, background 0.2s;
            white-space: nowrap;
        }

        .site-bar__chip:hover,
        .site-bar__action:hover {
            color: var(--brass);
            border-color: var(--brass);
        }

        .site-bar__chip.is-active {
            background: var(--brass);
            color: var(--bg);
            border-color: var(--brass);
        }

        .site-bar__actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        @media (max-width: 720px) {
            .site-bar {
                flex-direction: column;
                align-items: flex-start;
                padding-inline: 20px;
            }

            .site-bar__nav,
            .site-bar__actions {
                justify-content: flex-start;
            }
        }
    `;
    document.head.appendChild(style);
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

    if (publishedId) {
        const pub = document.createElement('meta');
        pub.name = 'epk:publication';
        pub.content = publishedId;
        document.head.appendChild(pub);
    }
}

function buildStructuredData() {
    const socialLinks = Object.values(epk.meta.social || {}).filter(Boolean);
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: epk.meta.name,
        jobTitle: epk.meta.tagline,
        address: epk.meta.location,
        url: canonicalPageUrl(),
        sameAs: socialLinks,
        image: mode?.hero ? assetURL(mode.hero) : undefined,
        description: epk.bio?.short || epk.meta.tagline,
        knowsAbout: (epk.offerings || []).map(o => o.title).filter(Boolean),
        identifier: publishedId || undefined
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
        publication: {
            id: publishedId || null,
            url: isPublished ? canonicalPageUrl() : null
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
            heroImage: active?.hero ? assetURL(active.hero) : '',
            heroCaption: active?.heroCaption || '',
            gallery: (epk.gallery || []).slice(0, 6).map(photo => ({
                ...photo,
                src: assetURL(photo.src)
            })),
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
    const parts = [];
    if (!isPublished) {
        parts.push(renderTopBar());
    }
    parts.push(renderHero());
    const wrapOpen = `<div class="content">`;
    const wrapClose = `</div>`;

    mode.sections.forEach(section => {
        switch (section) {
            case 'bio':
                parts.push(wrapOpen + renderBio() + wrapClose);
                break;
            case 'offerings': {
                const offers = selectedForMode(epk.offerings);
                if (offers.length) parts.push(wrapOpen + renderOfferings(offers) + wrapClose);
                break;
            }
            case 'credits': {
                const credits = selectedForMode(epk.credits);
                if (credits.length) parts.push(wrapOpen + renderCredits(credits) + wrapClose);
                break;
            }
            case 'videos': {
                const videos = selectedForMode(epk.videos);
                if (videos.length) parts.push(wrapOpen + renderVideos(videos) + wrapClose);
                break;
            }
            case 'releases': {
                const releases = selectedForMode(epk.releases);
                if (releases.length) parts.push(wrapOpen + renderReleases(releases) + wrapClose);
                break;
            }
            case 'gallery': {
                const srcs = mode.galleryPhotos || [];
                if (srcs.length > 0) {
                    const lookup = Object.fromEntries((epk.gallery || []).map(g => [g.src, g]));
                    const photos = srcs.map(s => lookup[s] || { src: s, caption: '' });
                    parts.push(wrapOpen + renderGallery(photos) + wrapClose);
                }
                break;
            }
            case 'contact':
                parts.push(wrapOpen + renderContact() + wrapClose);
                break;
        }
    });

    if (!isPublished) {
        parts.push(renderFooter());
    }
    return parts.join('');
}

function renderTopBar() {
    return `
    <header class="site-bar" data-ai-surface="spectra" data-epk-section="utility">
        <div class="site-bar__brand">
            <a class="site-bar__home" href="/">${epk.meta.name}</a>
            <span class="site-bar__mode">${mode.label} view</span>
        </div>
        <nav class="site-bar__nav" aria-label="Audience modes">
            ${renderModeLinks()}
        </nav>
        <div class="site-bar__actions">
            <a class="site-bar__action" href="/gallery.html">Gallery</a>
        </div>
    </header>`;
}

function renderModeLinks() {
    return Object.entries(epk.modes || {}).map(([key, item]) => {
        const href = publicRouteForMode(key);
        const active = key === modeKey ? ' is-active' : '';
        const current = key === modeKey ? ' aria-current="page"' : '';
        return `<a class="site-bar__chip${active}" href="${href}"${current}>${item.label}</a>`;
    }).join('');
}

function assetURL(path) {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;

    const cleanPath = String(path).replace(/^\/+/, '');
    const publicBase = window.__EPK_PUBLIC_BASE__ || '/';

    try {
        return new URL(cleanPath, publicBase).href;
    } catch {
        return `/${cleanPath}`;
    }
}

function canonicalPageUrl() {
    return window.location.href.split('?')[0];
}

// ── Hero ──────────────────────────────────────────────────────────
function renderHero() {
    return `
    <section class="hero" data-epk-section="hero" data-epk-mode="${modeKey}">
        <img class="hero__img" src="${assetURL(mode.hero)}" alt="${epk.meta.name}">
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
function renderReleases(releases) {
    return `
    <section class="epk-section" data-epk-section="releases">
        <p class="section-label">Selected Releases</p>
        <div class="video-list">
            ${releases.map(r => `
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
            ${photos.map(g => `<img src="${assetURL(g.src)}" alt="${g.caption || 'Dave Knowles'}" title="${g.caption || ''}">`).join('')}
        </div>
        ${isPublished ? '' : '<a class="gallery-more" href="/gallery.html">View all photos →</a>'}
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
