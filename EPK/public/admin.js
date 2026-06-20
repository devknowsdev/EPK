let db = {};
let selected = null;

async function init() {
    const res = await fetch('data/epk.json');
    db = await res.json();
    renderLayout();
}

function renderLayout() {
    document.getElementById("layout").innerHTML = `
        <h2>Layout</h2>

        ${db.layout.map((b,i) => `
            <div class="card">
                <strong>${b.type}</strong> &nbsp; <code style="color:#888;font-size:12px">${b.id}</code>
                <div style="margin-top:8px">
                    <button onclick="edit('${b.id}')">✏️ Edit</button>
                    <button onclick="remove(${i})">🗑 Delete</button>
                    <button onclick="move(${i},-1)" ${i === 0 ? 'disabled' : ''}>↑</button>
                    <button onclick="move(${i},1)" ${i === db.layout.length-1 ? 'disabled' : ''}>↓</button>
                </div>
            </div>
        `).join("")}

        <hr>
        <p><strong>Add block:</strong></p>
        <button onclick="add('hero')">+ Hero</button>
        <button onclick="add('bio')">+ Bio</button>
        <button onclick="add('offerings')">+ Offerings</button>
        <button onclick="add('videos')">+ Videos</button>
        <button onclick="add('gallery')">+ Gallery</button>

        <hr>
        <button onclick="save()">💾 Save to LocalStorage</button>
        <button onclick="exportJSON()" style="background:#d4edda;border-color:#a8d5b5">⬇️ Export JSON</button>
    `;
}

function edit(id) {
    selected = id;

    document.getElementById("editor").innerHTML = `
        <h2>Edit: <code>${id}</code></h2>
        <textarea id="box">${JSON.stringify(db.content[id], null, 2)}</textarea>
        <br>
        <button onclick="apply()">✅ Apply Changes</button>
        <button onclick="document.getElementById('editor').innerHTML=''">Cancel</button>
        <p id="edit-status" style="color:green;font-size:13px"></p>
    `;
}

function apply() {
    try {
        db.content[selected] = JSON.parse(document.getElementById("box").value);
        document.getElementById("edit-status").textContent = "✓ Applied. Export JSON to publish.";
    } catch (e) {
        alert("Invalid JSON — check your syntax and try again.");
    }
}

function add(type) {
    const id = type + "_" + Math.random().toString(36).slice(2,7);

    db.layout.push({ type, id });

    db.content[id] =
        type === "hero"      ? { image: "", caption: "" } :
        type === "bio"       ? ["New paragraph"] :
        type === "offerings" ? [{ title: "New Offering", description: "" }] :
        type === "videos"    ? [{ title: "New Video", url: "" }] :
        type === "gallery"   ? [{ src: "" }] :
        {};

    renderLayout();
}

function remove(i) {
    if (!confirm(`Delete block "${db.layout[i].type}"?`)) return;
    db.layout.splice(i, 1);
    renderLayout();
}

function move(i, d) {
    const arr = db.layout;
    const target = i + d;
    if (target < 0 || target >= arr.length) return;
    [arr[i], arr[target]] = [arr[target], arr[i]];
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
