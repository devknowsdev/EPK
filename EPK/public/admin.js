let db = {};
let selected = null;

async function init() {
    const res = await fetch('data/epk.json');
    db = await res.json();
    renderLayout();
}

function renderLayout() {
    document.getElementById("layout").innerHTML = `
        <div class="block-list">
            ${db.layout.map((b, i) => `
                <div class="block-row">
                    <strong>${b.type}</strong>
                    <code>${b.id}</code>
                    <button class="btn" onclick="edit('${b.id}')">✏ Edit</button>
                    <button class="btn" onclick="move(${i}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn" onclick="move(${i}, 1)" ${i === db.layout.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="btn btn-danger" onclick="remove(${i})">✕</button>
                </div>
            `).join("")}
        </div>

        <hr class="divider">
        <p class="section-label" style="margin-bottom:16px">Add block</p>
        <div class="add-row">
            <button class="btn" onclick="add('hero')">+ Hero</button>
            <button class="btn" onclick="add('bio')">+ Bio</button>
            <button class="btn" onclick="add('offerings')">+ Offerings</button>
            <button class="btn" onclick="add('videos')">+ Videos</button>
            <button class="btn" onclick="add('gallery')">+ Gallery</button>
            <button class="btn" onclick="add('contact')">+ Contact</button>
        </div>

        <hr class="divider">
        <div style="display:flex;gap:10px">
            <button class="btn" onclick="save()">💾 Save to LocalStorage</button>
            <button class="btn btn-primary" onclick="exportJSON()">⬇ Export JSON</button>
        </div>
    `;
}

function edit(id) {
    selected = id;
    document.getElementById("editor").innerHTML = `
        <div class="editor-box">
            <h2>Editing: <code style="font-size:0.85em;color:var(--stone)">${id}</code></h2>
            <textarea id="box">${JSON.stringify(db.content[id], null, 2)}</textarea>
            <div class="edit-actions">
                <button class="btn btn-primary" onclick="apply()">✓ Apply</button>
                <button class="btn" onclick="document.getElementById('editor').innerHTML=''">Cancel</button>
                <span class="edit-status" id="edit-status"></span>
            </div>
        </div>
    `;
}

function apply() {
    try {
        db.content[selected] = JSON.parse(document.getElementById("box").value);
        document.getElementById("edit-status").textContent = "✓ Applied — export JSON to publish";
    } catch (e) {
        alert("Invalid JSON — check your syntax.");
    }
}

function add(type) {
    const id = type + "_" + Math.random().toString(36).slice(2, 7);
    db.layout.push({ type, id });
    db.content[id] =
        type === "hero"      ? { image: "", caption: "", tagline: "" } :
        type === "bio"       ? ["New paragraph."] :
        type === "offerings" ? [{ title: "New Offering", description: "" }] :
        type === "videos"    ? [{ title: "New Video", url: "" }] :
        type === "gallery"   ? [{ src: "" }] :
        type === "contact"   ? [{ label: "Email", value: "you@example.com", href: "mailto:you@example.com" }] :
        {};
    renderLayout();
}

function remove(i) {
    if (!confirm(`Delete "${db.layout[i].type}" block?`)) return;
    db.layout.splice(i, 1);
    renderLayout();
}

function move(i, d) {
    const arr = db.layout;
    const t = i + d;
    if (t < 0 || t >= arr.length) return;
    [arr[i], arr[t]] = [arr[t], arr[i]];
    renderLayout();
}

function save() {
    localStorage.setItem("epk", JSON.stringify(db));
    alert("Saved to localStorage.");
}

function exportJSON() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "epk.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
}

init();
