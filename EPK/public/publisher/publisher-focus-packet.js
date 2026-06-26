let lastFocusPacket=null;

// Focus packet panel — EPK proposes reviewed event/task packets for prism-focus.
document.addEventListener('DOMContentLoaded',()=>{
  const page=document.getElementById('page-brief');
  if(!page||document.getElementById('focus-packet-panel'))return;
  const panel=document.createElement('section');
  panel.className='panel';
  panel.id='focus-packet-panel';
  panel.innerHTML=`
    <div class="panel-head">
      <div>
        <h3>Focus task packet</h3>
        <p class="help">Create an <code>epk-to-focus.event-packet</code> JSON payload for review inside prism-focus.</p>
      </div>
      <button class="btn btn-primary" type="button" id="generate-focus-packet-btn">Generate Focus packet</button>
    </div>
    <div class="action-list">
      <button class="btn btn-secondary" type="button" id="copy-focus-packet-btn">Copy Focus packet</button>
      <button class="btn btn-secondary" type="button" id="download-focus-packet-btn">Download Focus packet JSON</button>
    </div>
    <textarea id="focus-packet-json" readonly rows="18" spellcheck="false" placeholder="Generated Focus packet JSON will appear here."></textarea>
    <p class="help">EPK proposes tasks. Focus reviews and imports selected tasks.</p>`;
  page.appendChild(panel);
  document.getElementById('generate-focus-packet-btn')?.addEventListener('click',generateFocusPacket);
  document.getElementById('copy-focus-packet-btn')?.addEventListener('click',copyFocusPacket);
  document.getElementById('download-focus-packet-btn')?.addEventListener('click',downloadFocusPacket);
});

// Publisher chrome simplification — keep global controls calm and labelled.
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(simplifyPublisherChrome,0);
  setTimeout(simplifyPublisherChrome,700);
  setTimeout(simplifyPublisherChrome,1800);
});

function simplifyPublisherChrome(){
  injectPublisherChromeStyles();
  simplifyTopActions();
  rebuildPublisherNav();
}

function injectPublisherChromeStyles(){
  if(document.getElementById('publisher-chrome-simplify-styles'))return;
  const style=document.createElement('style');
  style.id='publisher-chrome-simplify-styles';
  style.textContent=`
    .top-actions-clear{align-items:flex-start;justify-content:flex-end;min-width:min(420px,100%)}
    .top-actions-clear>.btn{min-width:92px;font-weight:800}.publisher-tools-menu{position:relative}.publisher-tools-menu>summary{list-style:none}.publisher-tools-menu>summary::-webkit-details-marker{display:none}.publisher-tools-menu[open]>summary{border-color:var(--accent);color:var(--accent-2)}
    .publisher-tools-panel{position:absolute;right:0;top:calc(100% + 8px);z-index:80;width:min(280px,calc(100vw - 40px));display:grid;gap:8px;padding:10px;border:1px solid var(--rule-strong);background:var(--surface2);box-shadow:var(--shadow)}
    .publisher-tools-panel .btn{justify-content:flex-start;width:100%;text-align:left}.publisher-tools-note{margin:2px 0 0;color:var(--dim);font-size:.75rem;line-height:1.35}.publisher-primary-nav{gap:8px}.nav-section-label{margin:12px 8px 3px;color:var(--dim);font-size:.62rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.nav-item-primary{border-left-color:var(--warning);background:rgba(209,166,90,.11);color:#ead4a8;font-weight:800}.nav-item-primary:hover{background:rgba(209,166,90,.16);color:#f1dbad}.nav-group-tools{border-color:rgba(209,166,90,.22)}
    @media(max-width:1040px){.top-actions-clear{min-width:0;width:100%;justify-content:flex-start}.publisher-tools-panel{left:0;right:auto}.publisher-primary-nav{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}}
  `;
  document.head.appendChild(style);
}

function simplifyTopActions(){
  const topActions=document.querySelector('.top-actions');
  if(!topActions||topActions.dataset.simplified==='1')return;
  topActions.dataset.simplified='1';
  topActions.classList.add('top-actions-clear');
  topActions.innerHTML=`
    <button class="btn btn-secondary" type="button" id="publisher-preview-top-btn">Preview</button>
    <button class="btn btn-primary" type="button" id="publisher-publish-top-btn">Publish</button>
    <details class="publisher-tools-menu">
      <summary class="btn btn-secondary">Tools</summary>
      <div class="publisher-tools-panel">
        <button class="btn btn-secondary" type="button" id="validate-top-btn">Check data</button>
        <button class="btn btn-secondary" type="button" id="download-top-btn">Backup JSON</button>
        <button class="btn btn-secondary" type="button" id="publisher-brief-top-btn">Promo Kit</button>
        <button class="btn btn-secondary" type="button" id="publisher-json-top-btn">Advanced JSON</button>
        <p class="publisher-tools-note">Recovery, backup, and advanced controls live here so the top bar stays calm.</p>
      </div>
    </details>`;
  document.getElementById('publisher-preview-top-btn')?.addEventListener('click',()=>showPage('dashboard'));
  document.getElementById('publisher-publish-top-btn')?.addEventListener('click',()=>showPage('publish'));
  document.getElementById('validate-top-btn')?.addEventListener('click',()=>validateData());
  document.getElementById('download-top-btn')?.addEventListener('click',()=>downloadJSON());
  document.getElementById('publisher-brief-top-btn')?.addEventListener('click',()=>showPage('brief'));
  document.getElementById('publisher-json-top-btn')?.addEventListener('click',()=>showPage('json'));
}

function rebuildPublisherNav(){
  const nav=document.querySelector('.nav');
  if(!nav||nav.dataset.rebuilding==='1')return;
  nav.dataset.rebuilding='1';
  nav.classList.add('publisher-primary-nav');
  nav.innerHTML=`
    <button class="nav-item active" type="button" data-page="dashboard">Dashboard</button>
    <div class="nav-section-label">Build</div>
    <details class="nav-group" open>
      <summary>Profile & content</summary>
      <button class="nav-item" type="button" data-page="profile">Identity</button>
      <button class="nav-item" type="button" data-page="bio">Biography</button>
      <button class="nav-item" type="button" data-page="offerings">Offerings</button>
      <button class="nav-item" type="button" data-page="credits">Proof / credits</button>
    </details>
    <details class="nav-group">
      <summary>Media</summary>
      <button class="nav-item" type="button" data-page="videos">Videos</button>
      <button class="nav-item" type="button" data-page="releases">Releases</button>
      <button class="nav-item" type="button" data-page="gallery">Gallery</button>
    </details>
    <button class="nav-item" type="button" data-page="modes">Audience Pages</button>
    <div class="nav-section-label">Tools</div>
    <details class="nav-group nav-group-tools">
      <summary>Design & advanced</summary>
      ${typeof showExtensionPage==='function'?'<button class="nav-item" type="button" data-extension-nav="site-templates">Site templates</button><button class="nav-item" type="button" data-extension-nav="poster">Poster studio</button><button class="nav-item" type="button" data-extension-nav="contact">Contact UX</button>':''}
      <button class="nav-item" type="button" data-page="brief">Promo Kit</button>
      <button class="nav-item" type="button" data-page="json">Advanced JSON</button>
    </details>
    <button class="nav-item nav-item-primary" type="button" data-page="publish">Publish</button>`;

  nav.querySelectorAll('[data-page]').forEach(btn=>{
    btn.addEventListener('click',()=>showPage(btn.dataset.page));
  });
  nav.querySelectorAll('[data-extension-nav]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(typeof showExtensionPage==='function')showExtensionPage(btn.dataset.extensionNav);
    });
  });
  nav.dataset.rebuilding='0';
}

function generateFocusPacket(){
  const event=readFocusPacketEvent();
  if(!event.title||!event.date){setStatus('warn','Add event name and date before creating a Focus packet.');return null;}
  const recordId=makeFocusPacketRecordId(event);
  const modeKey=document.getElementById('brief-mode')?.value||'default';
  lastFocusPacket={
    schemaVersion:'1.0.0',
    packetType:'epk-to-focus.event-packet',
    source:{system:'EPK',recordId,recordUrl:publicURLForMode(modeKey),exportedAt:new Date().toISOString()},
    review:{status:'pending',required:true,notes:'Generated by EPK Publisher. Import through prism-focus review only.'},
    event:{title:event.title,act:currentData?.meta?.name||'Dave Knowles',project:currentData?.meta?.tagline||'',status:'draft',date:event.date,timezone:'Africa/Johannesburg',venue:event.venue,city:event.city,ctaUrl:event.cta,sourceLink:publicURLForMode(modeKey)},
    deadlines:buildFocusPacketDeadlines(event.date),
    travelAdminWindows:[],
    tasks:buildFocusPacketTasks(event,recordId)
  };
  const output=document.getElementById('focus-packet-json');
  if(output)output.value=JSON.stringify(lastFocusPacket,null,2);
  setStatus('success','Generated Focus packet JSON.');
  return lastFocusPacket;
}

function readFocusPacketEvent(){
  return {
    title:document.getElementById('brief-event')?.value.trim()||'',
    date:normalizeFocusPacketDate(document.getElementById('brief-date')?.value.trim()||''),
    venue:document.getElementById('brief-venue')?.value.trim()||'',
    city:document.getElementById('brief-city')?.value.trim()||'',
    cta:document.getElementById('brief-cta')?.value.trim()||''
  };
}

function buildFocusPacketTasks(event,recordId){
  const d=buildFocusPacketDeadlines(event.date);
  return [
    {kind:'poster',title:`Create poster for ${event.title}`,scope:'project',dueDate:d.poster,estimatedMinutes:45,category:'Music admin',notes:'Prepare visual promo asset from EPK event details.',sourceId:`${recordId}:poster`},
    {kind:'social',title:`Announce ${event.title}`,scope:'project',dueDate:d.socialAnnouncement,estimatedMinutes:25,category:'Music admin',notes:event.cta?`Include CTA: ${event.cta}`:'Draft announcement copy and confirm CTA.',sourceId:`${recordId}:announce`},
    {kind:'press',title:`Send press/venue blurb for ${event.title}`,scope:'project',dueDate:d.press,estimatedMinutes:30,category:'Music admin',notes:'Use EPK promo brief and audience route as source material.',sourceId:`${recordId}:press`},
    {kind:'admin',title:`Confirm details for ${event.title}`,scope:'project',dueDate:event.date,estimatedMinutes:20,category:'Music admin',notes:[event.venue,event.city].filter(Boolean).join(', ')||'Confirm venue, time, and contact details.',sourceId:`${recordId}:confirm`},
    {kind:'follow-up',title:`Post-gig follow-up for ${event.title}`,scope:'project',dueDate:d.postGigFollowUp,estimatedMinutes:20,category:'Music admin',notes:'Thank venue/audience, save useful assets, and note what worked.',sourceId:`${recordId}:follow-up`}
  ].filter(task=>task.dueDate);
}

function buildFocusPacketDeadlines(dateString){
  const date=parseFocusPacketDate(dateString);
  if(!date)return{};
  return {poster:offsetFocusPacketDate(date,-14),press:offsetFocusPacketDate(date,-10),socialAnnouncement:offsetFocusPacketDate(date,-7),postGigFollowUp:offsetFocusPacketDate(date,1)};
}

function makeFocusPacketRecordId(event){
  const slug=(event.title||'event').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'event';
  return `${slug}-${event.date||new Date().toISOString().slice(0,10)}`;
}

function normalizeFocusPacketDate(value){
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?value:parsed.toISOString().slice(0,10);
}

function parseFocusPacketDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime())?null:date;
}

function offsetFocusPacketDate(date,days){
  const copy=new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate()+days);
  return copy.toISOString().slice(0,10);
}

async function copyFocusPacket(){
  if(!lastFocusPacket)generateFocusPacket();
  if(!lastFocusPacket)return;
  await copyText(JSON.stringify(lastFocusPacket,null,2),'Copied Focus packet JSON.');
}

function downloadFocusPacket(){
  if(!lastFocusPacket)generateFocusPacket();
  if(!lastFocusPacket)return;
  downloadTextFile(`${lastFocusPacket.source.recordId}.focus-packet.json`,JSON.stringify(lastFocusPacket,null,2),'application/json');
  setStatus('success','Downloaded Focus packet JSON.');
}
