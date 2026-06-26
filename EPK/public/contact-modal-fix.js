/*
MODULE: contact-modal-fix.js
LAYER: public/export UI safety patch
PURPOSE: Ensure the public/export contact modal starts closed and can always be dismissed.
USES: print.js contact modal IDs/classes.
INVARIANTS: Does not auto-open contact UI; preserves explicit Contact button behavior.
LAST_STABILIZED: 2026-06-27
*/
(function(){
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
    `;
    document.head.appendChild(style);
  }

  function hardCloseContactBox(){
    const box=document.getElementById('client-contact-box');
    if(!box)return;
    box.classList.add('hidden');
    box.setAttribute('aria-hidden','true');
  }

  function installContactDismissal(){
    injectModalFixStyles();
    const box=document.getElementById('client-contact-box');
    if(!box||box.dataset.dismissalPatched==='1')return;
    box.dataset.dismissalPatched='1';
    box.classList.add('hidden');
    box.setAttribute('aria-hidden','true');
    box.addEventListener('click',event=>{
      if(event.target===box)hardCloseContactBox();
    });
  }

  const originalClose=window.closeContactBox;
  window.closeContactBox=function(){
    if(typeof originalClose==='function')originalClose.apply(this,arguments);
    hardCloseContactBox();
  };

  const originalOpen=window.openContactBox;
  window.openContactBox=function(){
    injectModalFixStyles();
    if(typeof originalOpen==='function')originalOpen.apply(this,arguments);
    const box=document.getElementById('client-contact-box');
    if(box){
      box.classList.remove('hidden');
      box.setAttribute('aria-hidden','false');
      installContactDismissal();
    }
  };

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')hardCloseContactBox();
  });

  document.addEventListener('DOMContentLoaded',()=>{
    injectModalFixStyles();
    installContactDismissal();
    setTimeout(installContactDismissal,250);
    setTimeout(installContactDismissal,900);
  });
})();
