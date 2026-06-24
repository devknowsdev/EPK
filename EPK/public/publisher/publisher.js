let currentData = null;
let lastPublishedURL = localStorage.getItem('epk-publisher-last-url') || '';

const els = {};

function initPublisher() {
    ['json-box', 'gh-user', 'gh-repo', 'gh-branch', 'gh-path', 'gh-token', 'status'].forEach(id => {
        els[id] = document.getElementById(id);
    });

    restoreField('gh-user');
    restoreField('gh-repo');
    restoreField('gh-branch');
    restoreField('gh-path');

    document.getElementById('format-btn').addEventListener('click', formatJSON);
    document.getElementById('validate-btn').addEventListener('click', validateJSON);
    document.getElementById('download-btn').addEventListener('click', downloadJSON);
    document.getElementById('publish-btn').addEventListener('click', publishSnapshot);
    document.getElementById('copy-url-btn').addEventListener('click', copyLastURL);

    ['gh-user', 'gh-repo', 'gh-branch', 'gh-path'].forEach(id => {
        els[id].addEventListener('change', () => localStorage.setItem(`epk-publisher-${id}`, els[id].value.trim()));
    });

    loadData();
}

function restoreField(id) {
    const saved = localStorage.getItem(`epk-publisher-${id}`);
    if (saved) els[id].value = saved;
}

async function loadData() {
    try {
        const res = await fetch('/data/epk.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load /data/epk.json (${res.status})`);
        currentData = await res.json();
        els['json-box'].value = JSON.stringify(currentData, null, 2);
        setStatus('success', `Loaded public/data/epk.json.${lastPublishedURL ? `\nLast published URL: ${lastPublishedURL}` : ''}`);
    } catch (error) {
        setStatus('error', error.message);
    }
}

function parseEditorJSON() {
    return JSON.parse(els['json-box'].value);
}

function formatJSON() {
    try {
        currentData = parseEditorJSON();
        els['json-box'].value = JSON.stringify(currentData, null, 2);
        setStatus('success', 'JSON formatted.');
    } catch (error) {
        setStatus('error', `Invalid JSON: ${error.message}`);
    }
}

function validateJSON() {
    try {
        const data = parseEditorJSON();
        const issues = [];
        if (!data.meta?.name) issues.push('Missing meta.name');
        if (!data.meta?.email) issues.push('Missing meta.email');
        if (!data.bio?.short) issues.push('Missing bio.short');
        if (!data.modes?.default) issues.push('Missing modes.default');
        if (!Array.isArray(data.gallery)) issues.push('gallery must be an array');
        if (!Array.isArray(data.videos)) issues.push('videos must be an array');

        currentData = data;
        setStatus(issues.length ? 'error' : 'success', issues.length ? `Warnings:\n${issues.join('\n')}` : 'Ready to publish.');
    } catch (error) {
        setStatus('error', `Invalid JSON: ${error.message}`);
    }
}

function downloadJSON() {
    try {
        const data = parseEditorJSON();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'epk.json';
        a.click();
        URL.revokeObjectURL(a.href);
        setStatus('success', 'Downloaded epk.json.');
    } catch (error) {
        setStatus('error', `Cannot download invalid JSON: ${error.message}`);
    }
}

function normalizedPublishBase(raw) {
    const trimmed = (raw || '').trim().replace(/\/+$/, '');
    if (!trimmed) return 'EPK/public/published';
    return trimmed.endsWith('.json') ? trimmed.replace(/\/[^/]*$/, '') : trimmed;
}

function makePublishId() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '-');
    const rand = Math.random().toString(36).slice(2, 6);
    return `${stamp}-${rand}`;
}

async function publishSnapshot() {
    const token = els['gh-token'].value.trim();
    const owner = els['gh-user'].value.trim();
    const repo = els['gh-repo'].value.trim();
    const branch = els['gh-branch'].value.trim() || 'main';
    const basePath = normalizedPublishBase(els['gh-path'].value);

    if (!token) return setStatus('error', 'Paste a GitHub token for this publishing session. The token is not saved.');
    if (!owner || !repo) return setStatus('error', 'Fill in GitHub owner and repository.');

    let data;
    try {
        data = parseEditorJSON();
    } catch (error) {
        return setStatus('error', `Cannot publish invalid JSON: ${error.message}`);
    }

    const publishId = makePublishId();
    const path = `${basePath}/${publishId}/epk.json`;
    const pageURL = `${location.origin}/published/${publishId}/`;
    const apiURL = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const payload = JSON.stringify(data, null, 2);

    document.getElementById('publish-btn').disabled = true;
    setStatus('', `Publishing ${path}…`);

    try {
        const body = {
            message: `EPK publish ${publishId}`,
            content: btoa(unescape(encodeURIComponent(payload))),
            branch
        };
        const res = await fetch(apiURL, {
            method: 'PUT',
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            let message = `GitHub error ${res.status}`;
            try {
                const err = await res.json();
                if (err?.message) message = err.message;
            } catch (_) {}
            throw new Error(message);
        }

        lastPublishedURL = pageURL;
        localStorage.setItem('epk-publisher-last-url', pageURL);
        localStorage.setItem('epk-publisher-gh-path', basePath);
        els['gh-path'].value = basePath;
        setStatus('success', `Published snapshot.\n${pageURL}`);
    } catch (error) {
        setStatus('error', `Publish failed: ${error.message}`);
    } finally {
        document.getElementById('publish-btn').disabled = false;
    }
}

async function copyLastURL() {
    if (!lastPublishedURL) return setStatus('error', 'No published URL yet.');
    try {
        await navigator.clipboard.writeText(lastPublishedURL);
        setStatus('success', `Copied ${lastPublishedURL}`);
    } catch (error) {
        setStatus('error', `Copy failed. URL: ${lastPublishedURL}`);
    }
}

function setStatus(type, message) {
    els.status.className = `status ${type || ''}`.trim();
    els.status.textContent = message;
}

initPublisher();
