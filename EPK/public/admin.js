let db = {};
let loadedDB = {};
let history = [];

async function init() {
    const res = await fetch('data/epk.json');
    db = await res.json();
    loadedDB = structuredClone(db);
    history = JSON.parse(localStorage.getItem('epk-history') || '[]');
    saveHistory('Loaded initial version');
    renderModeLinks();
    renderEditor();
    renderPreview();
}

function renderModeLinks() {
    const base = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    document.getElementById("mode-links").innerHTML = Object.keys(db.modes || {}).map(key => {
        const url = key === 'default' ? base : `${base}?for=${key}`;
        return `<div class="mode-link-row"><span>${db.modes[key].label}</span><span>${url}</span><button onclick="copyLink(this,'${url}')">Copy</button></div>`;
    }).join('');
}

function copyLink(btn,url){
    navigator.clipboard.writeText(url);
    btn.textContent='Copied';
    setTimeout(()=>btn.textContent='Copy',1500);
}

function saveHistory(label='Edit'){
    history.unshift({
        label,
        date:new Date().toISOString(),
        data:structuredClone(db)
    });
    history=history.slice(0,20);
    localStorage.setItem('epk-history',JSON.stringify(history));
}

function undoJSON(){
    if(history.length<2)return alert('No previous version');
    history.shift();
    db=structuredClone(history[0].data);
    refreshEditor();
}

function restoreSnapshot(index){
    db=structuredClone(history[index].data);
    refreshEditor();
}

function refreshEditor(){
    document.getElementById('box').value=JSON.stringify(db,null,2);
    renderModeLinks();
    updatePreview();
}

function renderPreview(){
    if(document.getElementById('preview-panel'))return;
    const panel=document.createElement('div');
    panel.id='preview-panel';
    panel.innerHTML=`<hr><p>Live Preview</p><select id="preview-mode"></select><iframe id="preview-frame" style="width:100%;height:600px"></iframe>`;
    document.getElementById('editor-panel').appendChild(panel);
    const select=document.getElementById('preview-mode');
    Object.entries(db.modes||{}).forEach(([k,v])=>select.innerHTML+=`<option value="${k}">${v.label}</option>`);
    select.onchange=updatePreview;
    updatePreview();
}

function updatePreview(){
    const frame=document.getElementById('preview-frame');
    if(!frame)return;
    const mode=document.getElementById('preview-mode')?.value||'default';
    const base=location.href.replace('admin.html','index.html').split('?')[0];
    frame.src=mode==='default'?base:`${base}?for=${mode}`;
}

function renderEditor(){
    document.getElementById('editor-panel').innerHTML=`
    <hr><p>Edit Content</p>
    <textarea id="box">${JSON.stringify(db,null,2)}</textarea>
    <div style="margin-top:16px">
    <button onclick="applyJSON()">Validate</button>
    <button onclick="showChanges()">Preview Changes</button>
    <button onclick="exportJSON()">Export JSON</button>
    <button onclick="undoJSON()">Undo</button>
    </div>
    <div id="change-panel"></div>`;
}

function applyJSON(){
    try{
        db=JSON.parse(document.getElementById('box').value);
        saveHistory('Manual JSON edit');
        renderModeLinks();
        updatePreview();
    }catch(e){alert(e.message)}
}

function showChanges(){
    const before=JSON.stringify(loadedDB,null,2).split('\n');
    const after=JSON.stringify(db,null,2).split('\n');
    const changed=after.filter((line,i)=>line!==before[i]);
    document.getElementById('change-panel').innerHTML=`<pre style="margin-top:20px">${changed.length?changed.join('\n'):'No changes detected'}</pre>`;
}

function exportJSON(){
    const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='epk.json';
    a.click();
}

init();