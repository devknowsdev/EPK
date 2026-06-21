let db = {};

async function init() {
    const res = await fetch('data/epk.json');
    db = await res.json();
    renderModeLinks();
    renderEditor();
}

// ── Mode share links ──────────────────────────────────────────────
function renderModeLinks() {
    const base = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    const modes = Object.keys(db.modes);

    document.getElementById("mode-links").innerHTML = modes.map(key => {
        const m = db.modes[key];
        const url = key === 'default' ? base : `${base}?for=${key}`;
        return `
        <div class="mode-link-row">
            <span class="mode-link-label">${m.label}</span>
            <span class="mode-link-url">${url}</span>
            <button class="btn-copy" onclick="copyLink(this, '${url}')">Copy</button>
            <a class="btn" href="${url}" target="_blank" style="font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none">Open ↗</a>
        </div>`;
    }).join('');
}

function copyLink(btn, url) {
    navigator.clipboard.writeText(url).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// ── Full JSON editor ──────────────────────────────────────────────
function renderEditor() {
    document.getElementById("editor-panel").innerHTML = `
        <hr class="divider">
        <p class="section-label">Edit Content</p>

        <textarea id="box">${JSON.stringify(db, null, 2)}</textarea>

        <div class="edit-actions" style="margin-top:16px">
            <button class="btn btn-primary" onclick="applyJSON()">✓ Validate & Apply</button>
            <button class="btn btn-primary" onclick="exportJSON()">⬇ Export JSON</button>
            <button class="btn" onclick="resetJSON()">↺ Reset</button>
            <span class="edit-status" id="edit-status"></span>
        </div>

        <p style="font-size:0.75rem;color:var(--stone);margin-top:16px;line-height:1.6">
            Tip: Edit the JSON directly. The structure has sections for <code>meta</code>, <code>bio</code>, <code>offerings</code>, <code>credits</code>, <code>videos</code>, <code>releases</code>, <code>gallery</code>, and <code>modes</code>. Each video/offering/credit has a <code>tags</code> array that controls which mode it appears in.
        </p>
    `;
}

function applyJSON() {
    try {
        db = JSON.parse(document.getElementById("box").value);
        renderModeLinks();
        const status = document.getElementById("edit-status");
        status.textContent = "✓ Valid JSON — export to publish";
        setTimeout(() => status.textContent = '', 4000);
    } catch (e) {
        alert("Invalid JSON — " + e.message);
    }
}

function resetJSON() {
    if (!confirm("Reset editor to last loaded version?")) return;
    document.getElementById("box").value = JSON.stringify(db, null, 2);
}

function exportJSON() {
    try {
        // Validate first
        const parsed = JSON.parse(document.getElementById("box").value);
        const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "epk.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) {
        alert("Cannot export — JSON is invalid: " + e.message);
    }
}

init();
