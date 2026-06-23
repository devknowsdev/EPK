let db = {};
let loadedDB = {};
let history = [];
let visualMode = true;
let publishState = JSON.parse(localStorage.getItem('epk-publish-state') || 'null');

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
 <hr><button onclick="toggleEditor()">Toggle Advanced JSON</button>
 <div id="visual-editor"></div>
 <textarea id="box" style="display:none">${JSON.stringify(db,null,2)}</textarea>
 <div style="margin-top:15px">
 <button onclick="applyJSON()">Apply</button>
 <button onclick="showChanges()">Changes</button>
 <button onclick="validateEPK()">Validate</button>
 <button onclick="exportJSON()">Export</button>
 <button onclick="undoJSON()">Undo</button>
 </div><div id="change-panel"></div>`;
 renderVisualEditor();
}

function toggleEditor(){visualMode=!visualMode;document.getElementById('box').style.display=visualMode?'none':'block';}

function renderVisualEditor(){
 document.getElementById('visual-editor').innerHTML=(sectionEditor('Bio',db.bio||{})+arrayEditor('Videos',db.videos||[],'videos')+arrayEditor('Releases',db.releases||[],'releases')+arrayEditor('Gallery',db.gallery||[],'gallery'));
}

function sectionEditor(title,obj){return `<h3>${title}</h3>`+Object.keys(obj).map(k=>`<label>${k}<br><textarea onchange="updateField('bio','${k}',this.value)">${esc(obj[k])}</textarea></label>`).join('');}

function arrayEditor(title,arr,key){return `<h3>${title}</h3>`+arr.map((item,i)=>`<div draggable="true" ondragstart="dragItem(event,'${key}',${i})" style="border:1px solid #ccc;padding:8px;margin:5px"><b>${esc(item.title||item.name||'Item')}</b><br>${tagEditor(key,i,item)}<br><button onclick="duplicateItem('${key}',${i})">Duplicate</button><button onclick="removeItem('${key}',${i})">Delete</button></div>`).join('');}

function tagEditor(key,index,item){return (item.tags||[]).map(t=>`[${t}]`).join(' ');}

function updateField(section,key,value){db[section][key]=value;saveHistory('Visual edit');}
function duplicateItem(key,index){db[key].splice(index,0,structuredClone(db[key][index]));saveHistory('Duplicate');renderEditor();}
function removeItem(key,index){if(confirm('Delete item?')){db[key].splice(index,1);saveHistory('Delete');renderEditor();}}

let dragData=null;
function dragItem(e,key,index){dragData={key,index};}

document.addEventListener('drop',e=>{
 if(!dragData)return;
 const key=dragData.key;
 const item=db[key].splice(dragData.index,1)[0];
 db[key].push(item);
 dragData=null;
 saveHistory('Reorder');
 renderEditor();
});

definePublishState();

function definePublishState(){
 window.savePublishedSnapshot=function(commit='local'){
  publishState={timestamp:new Date().toISOString(),commit,snapshot:structuredClone(db)};
  localStorage.setItem('epk-publish-state',JSON.stringify(publishState));
 }
}

function validateEPK(){
 let issues=[];
 if(!db.meta)issues.push('Missing meta');
 if(!db.bio)issues.push('Missing bio');
 (db.videos||[]).forEach((v,i)=>{if(!v.title)issues.push(`Video ${i+1} missing title`)});
 document.getElementById('change-panel').innerHTML=`<pre>${issues.length?'Warnings:\n'+issues.join('\n'):'Ready to publish ✓'}</pre>`;
}

function applyJSON(){try{db=JSON.parse(document.getElementById('box').value);saveHistory('JSON edit');renderEditor();updatePreview();}catch(e){alert(e.message)}}

function showChanges(){
 const before=JSON.stringify(publishState?.snapshot||loadedDB,null,2).split('\n');
 const after=JSON.stringify(db,null,2).split('\n');
 const changed=after.filter((x,i)=>x!==before[i]);
 document.getElementById('change-panel').innerHTML=`<pre>${changed.length?changed.join('\n'):'No changes detected'}</pre>`;
}

function exportJSON(){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='epk.json';a.click();}
function esc(s){return (s||'').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;');}
init();