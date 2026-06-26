/* Load deploy-time Prism navigation defaults from ../prism-links.json.
   Browser overrides in localStorage win over deployed defaults. */
(function(){
  const STORAGE_PREFIX='prism-tools-url:';
  const STORAGE_MODE='prism-tools-preferred-mode';
  const CONFIG_PATHS=['../prism-links.json','/prism-links.json'];

  function storageKey(key){ return `${STORAGE_PREFIX}${key}`; }

  function seed(config){
    if(!config||typeof config!=='object') return;
    const links=config.links||{};
    Object.keys(links).forEach(key=>{
      const value=String(links[key]||'').trim();
      if(value&&!localStorage.getItem(storageKey(key))) localStorage.setItem(storageKey(key),value);
    });
    const preferred=String(config.preferredMode||'').trim();
    if(preferred&&!localStorage.getItem(STORAGE_MODE)) localStorage.setItem(STORAGE_MODE,preferred==='local'?'local':'online');
    window.__prismLinksConfig=config;
  }

  async function load(){
    for(const path of CONFIG_PATHS){
      try{
        const response=await fetch(path,{cache:'no-store'});
        if(!response.ok) continue;
        seed(await response.json());
        document.dispatchEvent(new CustomEvent('prism-links-config-loaded'));
        return;
      }catch(_err){
        // optional config
      }
    }
  }

  load();
})();
