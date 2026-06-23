let db = {};
let loadedDB = {};
let history = [];
let visualMode = true;

async function init(){
 const res=await fetch('data/epk.json');
 db=await res.json();
 loadedDB=structuredClone(db);
 history=JSON.parse(localStorage.getItem('epk-history')||'[]');
 saveHistory('Loaded');
 renderModeLinks();
 renderEditor();
 renderPreview();
}

function renderModeLinks(){
 const base=location.origin+location.pathname.replace('admin.html','index.html');
 document.getElementById('mode-links').innerHTML=Object.keys(db.modes||{}).map(k=>{
  const url=k==='default'?base:`${base}?for=${k}`;
  return `<div class="mode-link-row"><span>${db.modes[k].label}</span><button onclick="copyLink(this,'${url}')">Copy</button></div>`;
 }).join('');
}

function copyLink(btn,url){navigator.clipboard.writeText(url);btn.textContent='Copied';setTimeout(()=>btn.textContent='Copy',1500)}

function saveHistory(label='Edit'){
 history.unshift({label,date:new Date().toISOString(),data:structuredClone(db)});
 history=history.slice(0,20);
 localStorage.setItem('epk-history',JSON.stringify(history));
}

function undoJSON(){
 if(history.length<2)return;
 history.shift();
 db=structuredClone(history[0].data);
 renderEditor();
 renderModeLinks();
 updatePreview();
}

function renderPreview(){
 if(document.getElementById('preview-panel'))return;
 const p=document.createElement('div');
 p.id='preview-panel';
 p.innerHTML=`<hr><p>Live Preview</p><select id="preview-mode"></select><iframe id="preview-frame" style="width:100%;height:500px"></iframe>`;
 document.getElementById('editor-panel').appendChild(p);
 Object.entries(db.modes||{}).forEach(([k,v])=>document.getElementById('preview-mode').innerHTML+=`<option value="${k}">${v.label}</option>`);
 document.getElementById('preview-mode').onchange=updatePreview;
 updatePreview();
}

function updatePreview(){
 const f=document.getElementById('preview-frame');
 if(!f)return;
 const m=document.getElementById('preview-mode')?.value||'default';
 const base=location.href.replace('admin.html','index.html').split('?')[0];
 f.src=m==='default'?base:`${base}?for=${m}`;
}

function renderEditor(){
 document.getElementById('editor-panel').innerHTML=`
 <hr>
 <button onclick="toggleEditor()">Toggle Advanced JSON</button>
 <div id="visual-editor"></div>
 <textarea id="box" style="display:none">${JSON.stringify(db,null,2)}</textarea>
 <div style="margin-top:15px">
 <button onclick="applyJSON()">Apply</button>
 <button onclick="showChanges()">Changes</button>
 <button onclick="exportJSON()">Export</button>
 <button onclick="undoJSON()">Undo</button>
 </div>
 <div id="change-panel"></div>`;
 renderVisualEditor();
}

function toggleEditor(){
 const box=document.getElementById('box');
 visualMode=!visualMode;
 box.style.display=visualMode?'none':'block';
}

function renderVisualEditor(){
 const root=document.getElementById('visual-editor');
 let html='';
 html+=sectionEditor('Bio',db.bio||{});
 html+=arrayEditor('Videos',db.videos||[],'videos');
 html+=arrayEditor('Releases',db.releases||[],'releases');
 html+=arrayEditor('Gallery',db.gallery||[],'gallery');
 root.innerHTML=html;
}

function sectionEditor(title,obj){
 return `<h3>${title}</h3>${Object.keys(obj).map(k=>`<label>${k}<br><textarea onchange="updateField('bio','${k}',this.value)">${obj[k]||''}</textarea></label>`).join('')}`;
}

function arrayEditor(title,arr,key){
 return `<h3>${title}</h3>${arr.map((item,i)=>`<div draggable="true" style="border:1px solid #ccc;padding:8px;margin:5px"><b>${item.title||item.name||'Item'}</b><br><button onclick="duplicateItem('${key}',${i})">Duplicate</button><button onclick="removeItem('${key}',${i})">Delete</button></div>`).join('')}`;
}

function updateField(section,key,value){
 db[section][key]=value;
 saveHistory('Visual edit');
}

function duplicateItem(key,index){db[key].splice(index,0,structuredClone(db[key][index]));renderEditor();}
function removeItem(key,index){if(confirm('Delete item?')){db[key].splice(index,1);renderEditor();}}

function applyJSON(){
 try{
  db=JSON.parse(document.getElementById('box').value);
  saveHistory('JSON edit');
  renderEditor();
  updatePreview();
 }catch(e){alert(e.message)}
}

function showChanges(){
 const before=JSON.stringify(loadedDB,null,2).split('\n');
 const after=JSON.stringify(db,null,2).split('\n');
 const changed=after.filter((x,i)=>x!==before[i]);
 document.getElementById('change-panel').innerHTML=`<pre>${changed.length?changed.join('\n'):'No changes'}</pre>`;
}

function exportJSON(){
 const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download='epk.json';
 a.click();
}

init();