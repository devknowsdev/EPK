/* Prism suite launcher for EPK Publisher. */
(function(){
  const STORAGE_PREFIX='prism-tools-url:';
  const STORAGE_MODE='prism-tools-preferred-mode';
  const CONFIG_PATHS=['../prism-links.json','/prism-links.json'];
  const DEFAULTS={
    epkPublisherLocal:'http://localhost:8095/publisher/index.html',
    epkPublisherOnline:'',
    epkPublicLocal:'http://localhost:8095/',
    epkPublicOnline:'',
    focusLocal:'http://localhost:8080/',
    focusOnline:'',
    spectraLocal:'',
    spectraOnline:'',
    beamOnline:'https://github.com/devknowsdev/prism-beam'
  };
  const REPOS={
    epk:'https://github.com/devknowsdev/EPK',
    focus:'https://github.com/devknowsdev/prism-focus',
    spectra:'https://github.com/devknowsdev/prism-spectra',
    beam:'https://github.com/devknowsdev/prism-beam'
  };

  function safe(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function key(name){return `${STORAGE_PREFIX}${name}`;}
  function getUrl(name){return localStorage.getItem(key(name))??DEFAULTS[name]??'';}
  function setUrl(name,value){const next=String(value||'').trim(); if(next)localStorage.setItem(key(name),next); else localStorage.removeItem(key(name));}
  function mode(){return localStorage.getItem(STORAGE_MODE)||'online';}
  function setMode(value){localStorage.setItem(STORAGE_MODE,value==='local'?'local':'online');}
  function openUrl(url){if(url)window.open(url,'_blank','noopener');}

  async function loadConfig(){
    for(const path of CONFIG_PATHS){
      try{
        const response=await fetch(path,{cache:'no-store'});
        if(!response.ok)continue;
        const config=await response.json();
        Object.entries(config.links||{}).forEach(([name,value])=>{
          const next=String(value||'').trim();
          if(next&&!localStorage.getItem(key(name)))localStorage.setItem(key(name),next);
        });
        if(config.preferredMode&&!localStorage.getItem(STORAGE_MODE))setMode(config.preferredMode);
        window.__prismLinksConfig=config;
        return;
      }catch(_err){}
    }
  }

  function action(label,url,primary){
    if(!url)return `<span style="color:var(--dim);font-size:.78rem;padding:8px 0;">${safe(label)} not set</span>`;
    return `<button class="btn ${primary?'btn-primary':'btn-secondary'}" type="button" data-prism-url="${safe(url)}">${safe(label)}</button>`;
  }
  function card(item){
    const preferred=mode();
    const preferredUrl=preferred==='local'?(item.localUrl||item.onlineUrl):(item.onlineUrl||item.localUrl);
    return `<article style="border:1px solid var(--rule);background:var(--surface);padding:15px;display:grid;gap:10px;box-shadow:var(--shadow);"><div style="display:flex;justify-content:space-between;gap:10px;"><div><h3 style="margin:0;color:var(--text);font-size:1rem;letter-spacing:0;text-transform:none;">${safe(item.title)}</h3><p style="margin:3px 0 0;color:var(--accent);font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">${safe(item.status)}</p></div>${item.soon?'<span style="color:var(--warning);font-size:.64rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">soon</span>':''}</div><p class="help" style="margin:0;">${safe(item.description)}</p><div class="action-list">${action(`Open ${preferred}`,preferredUrl,true)}${action('Online',item.onlineUrl,false)}${action('Local',item.localUrl,false)}${item.repoUrl?action('Repo',item.repoUrl,false):''}</div><p class="help" style="margin:0;font-size:.76rem;">Defaults can come from prism-links.json; browser edits override them.</p></article>`;
  }
  function field(name,label,placeholder){return `<label>${safe(label)}<input data-prism-url-key="${safe(name)}" value="${safe(getUrl(name))}" placeholder="${safe(placeholder||'')}"></label>`;}

  function renderModal(){
    const here=window.location.href.split('#')[0];
    const publicEpk=new URL('../',here).href;
    const cards=[
      {title:'EPK Publisher',status:'Current workspace',description:'Music profile content, media, promo kit, audience pages, and publishing controls.',onlineUrl:getUrl('epkPublisherOnline')||here,localUrl:getUrl('epkPublisherLocal'),repoUrl:REPOS.epk},
      {title:'Public EPK',status:'Audience-facing site',description:'Open the public music and press site separately from the private publisher tools.',onlineUrl:getUrl('epkPublicOnline')||publicEpk,localUrl:getUrl('epkPublicLocal'),repoUrl:REPOS.epk},
      {title:'Focus',status:'Planning / daily OS',description:'Tasks, timers, routines, journaling, AI task support, and the personal working-memory dashboard.',onlineUrl:getUrl('focusOnline'),localUrl:getUrl('focusLocal'),repoUrl:REPOS.focus},
      {title:'Spectra',status:'AI cockpit',description:'Future local-first AI orchestration, approvals, project memory, and capability control.',onlineUrl:getUrl('spectraOnline'),localUrl:getUrl('spectraLocal'),repoUrl:REPOS.spectra,soon:true},
      {title:'Beam',status:'AI reference layer',description:'Context packs, handovers, architecture logs, research memory, schemas, and anti-drift guidance.',onlineUrl:getUrl('beamOnline'),localUrl:'',repoUrl:REPOS.beam,soon:true}
    ];
    return `<div id="publisher-prism-tools-modal" style="position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.46);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto;"><section role="dialog" aria-modal="true" aria-label="Prism Tools" style="width:min(1080px,100%);background:var(--bg);border:1px solid var(--rule-strong);box-shadow:0 24px 80px rgba(0,0,0,.38);"><header style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px;border-bottom:1px solid var(--rule);background:var(--surface);"><div><p class="kicker">Prism Tools</p><h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.7rem,3vw,2.4rem);line-height:1;color:var(--text);">One Prism workspace, online/local aware.</h2><p class="help" style="max-width:760px;margin:9px 0 0;">Use hosted URLs for normal work and local URLs only for branch testing.</p></div><button class="btn btn-secondary" type="button" id="publisher-prism-tools-close">Close</button></header><section style="padding:16px 20px;border-bottom:1px solid var(--rule);display:grid;gap:14px;"><label>Preferred opening mode<select id="publisher-prism-preferred-mode"><option value="online"${mode()==='online'?' selected':''}>Online first</option><option value="local"${mode()==='local'?' selected':''}>Local first</option></select></label><div class="form-grid">${field('epkPublisherOnline','EPK Publisher online URL','')}${field('epkPublisherLocal','EPK Publisher local URL','http://localhost:8095/publisher/index.html')}${field('epkPublicOnline','EPK public online URL','')}${field('epkPublicLocal','EPK public local URL','http://localhost:8095/')}${field('focusOnline','Focus online URL','')}${field('focusLocal','Focus local URL','http://localhost:8080/')}${field('spectraOnline','Spectra online/local UI URL','')}${field('beamOnline','Beam docs/reference URL','')}</div></section><section style="padding:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">${cards.map(card).join('')}</section></section></div>`;
  }

  function bind(){
    document.getElementById('publisher-prism-tools-close')?.addEventListener('click',closeModal);
    document.querySelectorAll('[data-prism-url]').forEach(button=>button.addEventListener('click',()=>openUrl(button.dataset.prismUrl)));
    document.querySelectorAll('[data-prism-url-key]').forEach(input=>{
      input.addEventListener('change',()=>setUrl(input.dataset.prismUrlKey,input.value));
      input.addEventListener('blur',()=>setUrl(input.dataset.prismUrlKey,input.value));
    });
    document.getElementById('publisher-prism-preferred-mode')?.addEventListener('change',event=>{setMode(event.target.value);showModal();});
  }
  async function showModal(){await loadConfig();document.getElementById('publisher-prism-tools-modal')?.remove();document.body.insertAdjacentHTML('beforeend',renderModal());bind();}
  function closeModal(){document.getElementById('publisher-prism-tools-modal')?.remove();}
  function install(){
    if(document.getElementById('publisher-prism-tools-btn'))return;
    const top=document.querySelector('.top-actions');
    if(!top)return;
    const button=document.createElement('button');
    button.id='publisher-prism-tools-btn';
    button.className='btn btn-primary';
    button.type='button';
    button.innerHTML='<i class="ti ti-apps"></i> Prism Tools';
    button.addEventListener('click',showModal);
    top.insertAdjacentElement('afterbegin',button);
  }
  window.openPublisherPrismTools=showModal;
  window.closePublisherPrismTools=closeModal;
  loadConfig();
  document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  setTimeout(install,250);
})();
