/*
MODULE: contact-modal-fix.js
LAYER: public/export UI safety patch
PURPOSE: Ensure the public/export contact modal starts closed and can always be dismissed, and keep client HTML hero CTAs focused.
USES: print.js contact modal IDs/classes.
INVARIANTS: Does not auto-open contact UI; preserves explicit Contact button behavior.
LAST_STABILIZED: 2026-06-27
*/
(function(){
  let contactTrigger=null;

  function injectModalFixStyles(){
    if(document.getElementById('client-contact-modal-fix-styles'))return;
    const style=document.createElement('style');
    style.id='client-contact-modal-fix-styles';
    style.textContent=`
      .client-contact-box.hidden,
      .client-contact-box[aria-hidden="true"]{
        display:none!important;
      }
      .client-contact-box:not(.hidden)[aria-hidden="false"]{
        display:grid;
      }
      .client-actions a.client-button[href]{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function removeRedundantOnlineEpkButton(){
    document.querySelectorAll('.client-actions a.client-button[href]').forEach(link=>{
      const label=(link.textContent||'').toLowerCase();
      if(label.includes('open online epk'))link.remove();
    });
  }

  function hardCloseContactBox(){
    const box=document.getElementById('client-contact-box');
    if(!box)return;
    box.classList.add('hidden');
    box.setAttribute('aria-hidden','true');
    if(contactTrigger?.isConnected)contactTrigger.focus();
    contactTrigger=null;
  }

  function installContactDismissal(){
    injectModalFixStyles();
    removeRedundantOnlineEpkButton();
    const box=document.getElementById('client-contact-box');
    if(!box||box.dataset.dismissalPatched==='1')return;
    box.dataset.dismissalPatched='1';
    box.addEventListener('click',event=>{
      if(event.target===box)window.closeContactBox();
    });
  }

  const originalClose=window.closeContactBox;
  window.closeContactBox=function(){
    if(typeof originalClose==='function')originalClose.apply(this,arguments);
    hardCloseContactBox();
  };

  const originalOpen=window.openContactBox;
  window.openContactBox=function(){
    contactTrigger=document.activeElement;
    injectModalFixStyles();
    removeRedundantOnlineEpkButton();
    installContactDismissal();
    if(typeof originalOpen==='function')originalOpen.apply(this,arguments);
    const box=document.getElementById('client-contact-box');
    if(box){
      box.classList.remove('hidden');
      box.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>(box.querySelector('#client-contact-message')||box.querySelector('input, textarea, button'))?.focus());
    }
  };

  document.addEventListener('keydown',event=>{
    const box=document.getElementById('client-contact-box');
    if(event.key==='Escape'&&box&&!box.classList.contains('hidden'))window.closeContactBox();
  });

  document.addEventListener('DOMContentLoaded',()=>{
    injectModalFixStyles();
    removeRedundantOnlineEpkButton();
    installContactDismissal();
    setTimeout(installContactDismissal,250);
    setTimeout(installContactDismissal,900);
  });
})();
