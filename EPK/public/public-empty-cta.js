/*
MODULE: public-empty-cta.js
LAYER: public render patch
PURPOSE: Turn the redacted EPK shell into a useful public outreach/profile CTA with an optional on-demand guide wizard.
USES: app.js globals after async data load, redacted EPK middleware response.
INVARIANTS: Shows no private content, social links, file links, media links, or publisher data to anonymous users.
LAST_STABILIZED: 2026-06-26
*/
(function(){
  const originalRenderPage = typeof renderPage === 'function' ? renderPage : null;
  const originalRenderTopBar = typeof renderTopBar === 'function' ? renderTopBar : null;

  const wizardSteps = [
    {
      label: 'Purpose',
      title: 'Decide what this page should do',
      body: 'Use it as one calm public link for a person, project, service, event, practice, organisation, or creative work. Start with the outcome: booking, enquiries, trust, portfolio review, press, applications, or client intake.',
      prompt: 'Write one sentence: “This page helps ____ understand ____ and do ____.”'
    },
    {
      label: 'Identity',
      title: 'Add the stable basics first',
      body: 'Name, location, one-line description, short bio, contact route, and the audience this page is for. Keep it useful even for someone who knows nothing about your field.',
      prompt: 'Collect: name, tagline, location, short bio, email or contact form, and one preferred call-to-action.'
    },
    {
      label: 'Proof',
      title: 'Add proof without overwhelming people',
      body: 'Proof can be credits, testimonials, case studies, projects, performances, writing, media, clients, talks, photos, links, qualifications, or selected outcomes. It does not have to be music-specific.',
      prompt: 'Choose 3–6 proof items that would make a stranger trust the page.'
    },
    {
      label: 'Audience routes',
      title: 'Shape the page for different readers',
      body: 'The same profile can speak differently to bookers, clients, press, collaborators, venues, funders, students, or communities. Create audience routes only when they reduce confusion.',
      prompt: 'Name up to three audience views and what each person needs to see first.'
    },
    {
      label: 'Publish safely',
      title: 'Preview, back up, then publish',
      body: 'Before publishing, check the public routes, export a JSON backup, confirm contact links, remove anything private, then publish. Keep sensitive materials behind the protected area.',
      prompt: 'Final check: no private phone/file/social links unless you genuinely want them public.'
    }
  ];

  function injectEmptyCtaStyles(){
    if(document.getElementById('epk-empty-cta-styles')) return;
    const style=document.createElement('style');
    style.id='epk-empty-cta-styles';
    style.textContent=`
      .empty-shell{min-height:100vh;background:radial-gradient(circle at top left,rgba(196,151,79,.18),transparent 32%),radial-gradient(circle at bottom right,rgba(79,143,115,.14),transparent 34%),var(--bg);color:var(--parchment, #f7f0df);}
      .empty-topbar{max-width:1120px;margin:0 auto;padding:20px 26px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--rule, rgba(255,255,255,.16));}
      .empty-brand{display:grid;gap:4px;min-width:0}.empty-kicker{margin:0;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--brass,#c49a5a);font-weight:800}.empty-title{margin:0;font-size:clamp(1.15rem,2.4vw,1.7rem);letter-spacing:-.04em}.empty-subtitle{margin:0;color:var(--stone,#b8ad9d);font-size:.88rem;line-height:1.45}.empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.empty-btn{border:1px solid var(--rule,rgba(255,255,255,.2));border-radius:999px;background:rgba(255,255,255,.06);color:var(--parchment,#f7f0df);font:inherit;font-size:.78rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;padding:10px 13px;cursor:pointer}.empty-btn:hover,.empty-btn:focus-visible{border-color:var(--brass,#c49a5a);color:var(--brass,#c49a5a);outline:none}.empty-btn-primary{background:var(--brass,#c49a5a);border-color:var(--brass,#c49a5a);color:var(--bg,#13110f)}.empty-btn-primary:hover,.empty-btn-primary:focus-visible{color:var(--bg,#13110f);filter:brightness(1.06)}
      .empty-main{max-width:1120px;margin:0 auto;padding:58px 26px 44px;display:grid;gap:26px}.empty-hero-card{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:26px;align-items:stretch}.empty-panel{border:1px solid var(--rule,rgba(255,255,255,.16));border-radius:28px;background:rgba(255,255,255,.045);box-shadow:0 22px 80px rgba(0,0,0,.2);padding:clamp(22px,4vw,40px)}.empty-hero h1{font-size:clamp(2.7rem,8vw,6rem);line-height:.9;letter-spacing:-.08em;margin:0 0 18px;color:var(--parchment,#f7f0df)}.empty-lead{font-size:clamp(1.05rem,2vw,1.34rem);line-height:1.55;color:var(--stone,#b8ad9d);margin:0 0 24px}.empty-lead strong{color:var(--brass,#c49a5a)}.empty-chip-row{display:flex;flex-wrap:wrap;gap:8px}.empty-chip{border:1px solid var(--rule,rgba(255,255,255,.16));border-radius:999px;padding:7px 10px;color:var(--stone,#b8ad9d);font-size:.78rem}.empty-side{display:grid;gap:14px}.empty-side h2,.empty-section h2{margin:0 0 10px;font-size:1.15rem;letter-spacing:-.02em}.empty-side p,.empty-section p{color:var(--stone,#b8ad9d);line-height:1.55}.empty-list{list-style:none;padding:0;margin:0;display:grid;gap:10px}.empty-list li{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start;color:var(--stone,#b8ad9d);line-height:1.45}.empty-list b{color:var(--parchment,#f7f0df)}.empty-num{width:28px;height:28px;border-radius:50%;background:rgba(196,154,90,.14);color:var(--brass,#c49a5a);display:grid;place-items:center;font-size:.74rem;font-weight:900}.empty-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.empty-section{border:1px solid var(--rule,rgba(255,255,255,.16));border-radius:20px;background:rgba(0,0,0,.12);padding:18px}.empty-section .empty-kicker{margin-bottom:8px}.empty-protected-note{border:1px dashed rgba(196,154,90,.5);border-radius:18px;padding:16px 18px;color:var(--stone,#b8ad9d);background:rgba(196,154,90,.08)}
      .empty-help-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:grid;place-items:center;z-index:9999;padding:18px}.empty-help-dialog{width:min(720px,100%);max-height:min(760px,92vh);overflow:auto;border-radius:26px;border:1px solid var(--rule,rgba(255,255,255,.18));background:#17130f;color:var(--parchment,#f7f0df);box-shadow:0 28px 100px rgba(0,0,0,.55)}.empty-help-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:22px 24px 14px;border-bottom:1px solid var(--rule,rgba(255,255,255,.14))}.empty-help-head h2{margin:4px 0 0;font-size:1.4rem}.empty-close{border:0;background:transparent;color:var(--stone,#b8ad9d);font:inherit;font-size:1.6rem;cursor:pointer}.empty-help-body{padding:22px 24px}.empty-stepper{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}.empty-step-dot{border:1px solid var(--rule,rgba(255,255,255,.16));border-radius:999px;padding:6px 9px;background:transparent;color:var(--stone,#b8ad9d);font-size:.72rem;font-weight:800;cursor:pointer}.empty-step-dot.is-active{background:var(--brass,#c49a5a);border-color:var(--brass,#c49a5a);color:#17130f}.empty-help-card{border:1px solid var(--rule,rgba(255,255,255,.14));border-radius:20px;background:rgba(255,255,255,.04);padding:20px}.empty-help-card h3{font-size:1.45rem;margin:0 0 10px}.empty-prompt{margin-top:16px;border-left:3px solid var(--brass,#c49a5a);padding:12px 14px;background:rgba(196,154,90,.08);color:var(--parchment,#f7f0df);line-height:1.45}.empty-help-foot{display:flex;justify-content:space-between;gap:10px;padding:16px 24px 22px;border-top:1px solid var(--rule,rgba(255,255,255,.14))}.empty-help-foot .empty-btn{min-width:98px}
      @media(max-width:860px){.empty-hero-card{grid-template-columns:1fr}.empty-grid{grid-template-columns:1fr}.empty-topbar{align-items:flex-start;flex-direction:column}.empty-actions{justify-content:flex-start}.empty-main{padding-top:32px}.empty-hero h1{font-size:clamp(2.4rem,15vw,4.5rem)}}
    `;
    document.head.appendChild(style);
  }

  function emptyTopBar(){
    return `<header class="empty-topbar" data-epk-section="redacted-shell-topbar">
      <div class="empty-brand">
        <p class="empty-kicker">Public profile shell</p>
        <h2 class="empty-title">One clear page for work, proof, and outreach.</h2>
        <p class="empty-subtitle">The private EPK content is protected. This public shell shows what the system can become.</p>
      </div>
      <div class="empty-actions">
        <button class="empty-btn empty-btn-primary" type="button" onclick="openEmptyEpkWizard()">How to build this</button>
        <a class="empty-btn" href="/publisher/index.html">Owner login</a>
      </div>
    </header>`;
  }

  function renderEmptyPublicPage(){
    injectEmptyCtaStyles();
    return `<div class="empty-shell" data-epk-redacted="true">
      ${emptyTopBar()}
      <main class="empty-main">
        <section class="empty-hero-card">
          <div class="empty-panel empty-hero">
            <p class="empty-kicker">For artists, freelancers, organisers, practitioners, speakers, teams, and small projects</p>
            <h1>A focused public page for being understood quickly.</h1>
            <p class="empty-lead"><strong>This is a public outreach kit:</strong> a simple place to explain who you are, what you do, why people should trust you, and what they can do next.</p>
            <div class="empty-chip-row" aria-label="Example uses">
              <span class="empty-chip">Portfolio</span>
              <span class="empty-chip">Press kit</span>
              <span class="empty-chip">Booking page</span>
              <span class="empty-chip">Speaker profile</span>
              <span class="empty-chip">Service page</span>
              <span class="empty-chip">Project brief</span>
            </div>
          </div>
          <aside class="empty-panel empty-side">
            <div>
              <p class="empty-kicker">What belongs here</p>
              <h2>Enough context to help a stranger decide.</h2>
            </div>
            <ul class="empty-list">
              <li><span class="empty-num">1</span><span><b>Identity:</b> name, role, location, and a plain-language tagline.</span></li>
              <li><span class="empty-num">2</span><span><b>Proof:</b> selected work, credits, projects, outcomes, media, or testimonials.</span></li>
              <li><span class="empty-num">3</span><span><b>Offer:</b> what someone can book, request, invite, hire, read, watch, or support.</span></li>
              <li><span class="empty-num">4</span><span><b>Next step:</b> one clean call-to-action instead of scattered links.</span></li>
            </ul>
            <div class="empty-protected-note">Content, social links, files, media, and publisher tools are protected until the owner unlocks them.</div>
          </aside>
        </section>
        <section class="empty-grid" aria-label="Ways to use this page">
          <article class="empty-section"><p class="empty-kicker">For creators</p><h2>Show the work without making people dig.</h2><p>Use audience routes for bookers, press, collaborators, funders, listeners, collectors, or clients.</p></article>
          <article class="empty-section"><p class="empty-kicker">For professionals</p><h2>Turn scattered credibility into one calm link.</h2><p>Collect your services, proof, short bio, talks, articles, photos, and contact route in one place.</p></article>
          <article class="empty-section"><p class="empty-kicker">For projects</p><h2>Make a shareable context page.</h2><p>Explain the purpose, who it is for, why it matters, and what someone should do next.</p></article>
        </section>
      </main>
      <div id="empty-epk-wizard-root"></div>
    </div>`;
  }

  let wizardIndex=0;

  function renderWizard(){
    injectEmptyCtaStyles();
    const root=document.getElementById('empty-epk-wizard-root')||document.body;
    const step=wizardSteps[wizardIndex];
    root.innerHTML=`<div class="empty-help-modal" role="dialog" aria-modal="true" aria-labelledby="empty-help-title">
      <section class="empty-help-dialog">
        <header class="empty-help-head">
          <div><p class="empty-kicker">Build guide</p><h2 id="empty-help-title">Populate and publish this page</h2></div>
          <button class="empty-close" type="button" aria-label="Close guide" onclick="closeEmptyEpkWizard()">×</button>
        </header>
        <div class="empty-help-body">
          <nav class="empty-stepper" aria-label="Guide steps">
            ${wizardSteps.map((s,i)=>`<button class="empty-step-dot${i===wizardIndex?' is-active':''}" type="button" onclick="setEmptyEpkWizardStep(${i})">${i+1}. ${s.label}</button>`).join('')}
          </nav>
          <article class="empty-help-card">
            <p class="empty-kicker">Step ${wizardIndex+1} of ${wizardSteps.length}</p>
            <h3>${step.title}</h3>
            <p>${step.body}</p>
            <div class="empty-prompt"><strong>Prompt:</strong> ${step.prompt}</div>
          </article>
        </div>
        <footer class="empty-help-foot">
          <button class="empty-btn" type="button" onclick="prevEmptyEpkWizardStep()" ${wizardIndex===0?'disabled':''}>Back</button>
          <button class="empty-btn empty-btn-primary" type="button" onclick="nextEmptyEpkWizardStep()">${wizardIndex===wizardSteps.length-1?'Done':'Next'}</button>
        </footer>
      </section>
    </div>`;
    const close=root.querySelector('.empty-close');
    if(close) close.focus();
  }

  window.openEmptyEpkWizard=function(){wizardIndex=0;renderWizard();};
  window.closeEmptyEpkWizard=function(){const root=document.getElementById('empty-epk-wizard-root');if(root) root.innerHTML='';};
  window.setEmptyEpkWizardStep=function(index){wizardIndex=Math.max(0,Math.min(wizardSteps.length-1,Number(index)||0));renderWizard();};
  window.nextEmptyEpkWizardStep=function(){if(wizardIndex>=wizardSteps.length-1){window.closeEmptyEpkWizard();return;}wizardIndex++;renderWizard();};
  window.prevEmptyEpkWizardStep=function(){wizardIndex=Math.max(0,wizardIndex-1);renderWizard();};

  document.addEventListener('keydown',function(event){
    if(event.key==='Escape') window.closeEmptyEpkWizard();
  });

  if(originalRenderPage){
    renderPage=function(){
      if(epk && epk.redacted) return renderEmptyPublicPage();
      return originalRenderPage();
    };
  }

  if(originalRenderTopBar){
    renderTopBar=function(){
      if(epk && epk.redacted) return emptyTopBar();
      return originalRenderTopBar();
    };
  }
})();
