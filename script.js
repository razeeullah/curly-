/* ==========================================================================
   SK Films — core behaviour
   Intro, navigation, portfolio, project detail, enquiry form.
   No dependencies. All enhancement supersets a working static page.
   ========================================================================== */
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const mobile = matchMedia('(max-width:760px)');
  const root = document.documentElement;
  const body = document.body;
  // Native smooth scrolling corrupts ScrollTrigger refresh measurements mid-scroll.
  root.style.scrollBehavior = 'auto';

  /* ── Shared state and helpers on window.SK ─────────────────────────────── */
  const introListeners = [];
  const coreCleanup = [];

  const SK = window.SK = {
    $, $$, reduce, fine, mobile,
    clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    /** progress of an element through the viewport, 0 → 1 */
    progress(el) {
      const r = el.getBoundingClientRect();
      return SK.clamp(-r.top / Math.max(1, r.height - innerHeight));
    },
    /** callbacks: 'introStart' | 'introEnd' | 'introSkipped' */
    onIntro(cb) { introListeners.push(cb); return () => { const i = introListeners.indexOf(cb); if (i >= 0) introListeners.splice(i, 1); }; },
    emit(name, data) { introListeners.forEach(cb => cb(name, data)); },
    isReady: false,
    sectionId: 'top'
  };

  /* ── Intro ─────────────────────────────────────────────────────────────── */
  const intro = $('#intro'), opening = $('#opening'), soundBtn = $('#sound');
  const fill = $('#progressFill'), timeEl = $('#introTime'), fallback = $('#introFallback');
  const VIDEO = 'assets/sk-films-ident.mp4';
  let closing = false, brokenTimer = 0, closeTimer = 0, introVersion = 0, introFocus = null;

  const seen = () => { try { return sessionStorage.getItem('sk-opening-seen') === '1'; } catch { return false; } };
  const markSeen = () => { try { sessionStorage.setItem('sk-opening-seen', '1'); } catch {} };
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  function resetChrome() {
    fallback.hidden = true;
    intro.classList.remove('is-hidden-chrome');
    fill.style.width = '0%';
    timeEl.firstChild.nodeValue = '00:00';
    soundBtn.textContent = 'Sound off';
    soundBtn.setAttribute('aria-pressed', 'false');
  }

  function openIntro() {
    if (intro.open) return;
    clearTimeout(closeTimer);
    const version = ++introVersion;
    introFocus = document.activeElement;
    body.classList.remove('is-ready');
    closing = false;
    intro.classList.remove('is-closing');
    resetChrome();
    opening.src = VIDEO;
    opening.muted = true;
    opening.currentTime = 0;
    intro.showModal();
    document.activeElement?.blur?.();
    $('#skipIntro').focus({ preventScroll: true });
    SK.emit('introStart');
    const attempt = opening.play();
    if (attempt) attempt.catch(() => {
      if (version !== introVersion || !intro.open || closing) return;
      /* Autoplay refused: offer a deliberate choice rather than a dead frame. */
      fallback.hidden = false;
      $('#introPlay').focus({ preventScroll: true });
    });
    clearTimeout(brokenTimer);
    brokenTimer = setTimeout(() => {
      if (!intro.open || closing || version !== introVersion || opening.readyState > 0) return;
      fallback.hidden = false;
    }, 6000);
  }

  function closeIntro(interrupted) {
    if (!intro.open || closing) return;
    closing = true;
    clearTimeout(brokenTimer);
    markSeen();
    opening.pause();
    try { opening.removeAttribute('src'); opening.load(); } catch {}
    intro.classList.add('is-closing');
    const done = () => {
      if (intro.open) intro.close();
      intro.classList.remove('is-closing');
      closing = false;
      body.classList.add('is-ready');
      SK.emit('introEnd', { interrupted });
      const target = introFocus?.isConnected && introFocus !== body ? introFocus : document.querySelector('[data-chapter]');
      target?.focus({ preventScroll: true });
    };
    if (reduce.matches) done(); else closeTimer = setTimeout(done, 920);
  }

  opening.addEventListener('ended', () => closeIntro(false));
  opening.addEventListener('error', () => {
    if (!intro.open || closing) return;
    fallback.hidden = false;
    $('#introEnter').focus({ preventScroll: true });
  });
  opening.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(opening.duration)) $('#introDuration').textContent = ' / ' + fmt(Math.ceil(opening.duration));
  });
  opening.addEventListener('waiting', () => {
    clearTimeout(brokenTimer);
    brokenTimer = setTimeout(() => { if (intro.open && !closing && opening.readyState < 3) fallback.hidden = false; }, 6000);
  });
  opening.addEventListener('playing', () => { clearTimeout(brokenTimer); fallback.hidden = true; });
  opening.addEventListener('timeupdate', () => {
    if (!Number.isFinite(opening.duration) || !opening.duration) return;
    const p = opening.currentTime / opening.duration;
    fill.style.width = (p * 100) + '%';
    timeEl.firstChild.nodeValue = fmt(opening.currentTime);

  });
  intro.addEventListener('cancel', e => { e.preventDefault(); closeIntro(true); });
  intro.addEventListener('close', () => {
    if (intro.open) return; // A queued close event must not pause a newly replayed intro.
    opening.pause(); clearTimeout(brokenTimer);
    body.classList.add('is-ready');
  });
  $('#skipIntro').addEventListener('click', () => closeIntro(true));
  $('#introEnter').addEventListener('click', () => closeIntro(true));
  $('#introPlay').addEventListener('click', () => {
    fallback.hidden = true;
    opening.muted = false;
    opening.play().then(() => {
      soundBtn.textContent = 'Sound on';
      soundBtn.setAttribute('aria-pressed', 'true');
    }).catch(() => {
      opening.muted = true;
      opening.play().catch(() => { fallback.hidden = false; });
    });
  });
  soundBtn.addEventListener('click', () => {
    opening.muted = !opening.muted;
    soundBtn.textContent = opening.muted ? 'Sound off' : 'Sound on';
    soundBtn.setAttribute('aria-pressed', String(!opening.muted));
    opening.play().catch(() => {});
  });
  $$('[data-replay]').forEach(b => b.addEventListener('click', () => { closeAllDialogs(); openIntro(); }));

  /* First visit: show the ident (unless reduced motion). Body starts ready so
     the page is usable even if scripting stalls. */
  if (seen() || reduce.matches) {
    body.classList.add('is-ready');
  } else {
    openIntro();
  }

  /* ── Header, menu, island ──────────────────────────────────────────────── */
  const header = $('.header'), menuToggle = $('#menuToggle'), menu = $('#siteMenu'), menuClose = $('#menuClose');
  const island = $('#island'), islandLabel = $('#islandLabel');
  let lastY = 0, menuWasOpen = false, menuVersion = 0;

  function openMenu() {
    if (!menu) return;
    const version = ++menuVersion;
    menu.hidden = false;
    requestAnimationFrame(() => { if (menuWasOpen && version === menuVersion) menu.classList.add('is-open'); });
    body.classList.add('nav-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    SK.closeIsland?.();
    menuWasOpen = true;
    $('#main').inert = true;
    $('.header').inert = true;
    SK.closeIsland?.();
    setTimeout(() => { if (menuWasOpen && version === menuVersion) $('#menuClose')?.focus({ preventScroll: true }); }, 60);
  }
  function closeMenu(restore = true) {
    if (!menuWasOpen) return;
    ++menuVersion;
    menu.classList.remove('is-open');
    body.classList.remove('nav-open');
    menuToggle.setAttribute('aria-expanded', 'false');

    menuWasOpen = false;
    $('#main').inert = false;
    $('.header').inert = false;
    setTimeout(() => { if (!menuWasOpen) menu.hidden = true; }, 600);
    if (restore) menuToggle.focus({ preventScroll: true });
  }
  menuToggle?.addEventListener('click', () => menuWasOpen ? closeMenu() : openMenu());

  menuClose?.addEventListener('click', () => closeMenu());
  menu?.addEventListener('click', e => { if (e.target === menu) closeMenu(); });
  $$('.site-menu-nav a', menu || document).forEach(a => a.addEventListener('click', () => { closeMenu(false); }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (menuWasOpen) { e.preventDefault(); closeMenu(); return; }
    if (intro.open) { e.preventDefault(); closeIntro(true); }
  });
  /* Simple focus trap for the menu panel (native dialog handles the others). */
  menu?.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !menuWasOpen) return;
    const f = $$('a[href],button:not([disabled])', menu).filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Header behaviour is handled in the scroll engine (motion.js) which calls
     SK.updateHeader(y). Defined here so it works even without motion.js. */
  SK.updateHeader = y => {
    const solid = y > innerHeight * .6;
    header.classList.toggle('is-solid', solid);
    const goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (y > innerHeight * .9 && goingDown && !menuWasOpen) header.classList.add('is-hidden');
    else if (goingUp || y < innerHeight * .5) header.classList.remove('is-hidden');
    body.classList.toggle('quick-nav', y > innerHeight * .8);
    lastY = y;
  };
  SK.setSection = (id, label) => {
    SK.sectionId = id;
    if (islandLabel) islandLabel.textContent = label || 'SK Films';
    $$('.header-nav a').forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
    });
    $$('.dock a').forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      on ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current');
    });
  };

  window.addEventListener('scroll', () => SK.updateHeader(scrollY), { passive: true });
  SK.updateHeader(scrollY);

  /* The island/dock stay out of the way of the form and dialogs. */
  const form = $('#enquiry');
  const setFormActive = on => body.classList.toggle('form-active', on);
  form?.addEventListener('focusin', () => setFormActive(true));
  form?.addEventListener('focusout', e => { if (!form.contains(e.relatedTarget)) setFormActive(false); });
  if ('IntersectionObserver' in window && $('#contact')) {
    new IntersectionObserver(es => setFormActive(es[0].intersectionRatio > .22), { threshold: [0, .22, .5] }).observe($('#contact'));
  }

  /* ── Portfolio: one collection, five synchronized presentations ───────── */
  const grid = $('#projects'), cards = $$('.project', grid);
  const steps = $('.gallery-steps'), statusEl = $('#galleryStatus');
  const prevBtn = $('#galleryPrev'), nextBtn = $('#galleryNext'), resetBtn = $('#galleryReset');
  const gallery = $('#gallery'), help = $('#galleryHelp'), announcement = $('#galleryAnnouncement');
  const panCanvas = document.createElement('div'); panCanvas.className = 'pan-canvas';
  cards.forEach(card => panCanvas.append(card)); grid.append(panCanvas);
  const MODES = ['grid','list','cover','pan','strip'];
  const HELP = {
    grid: 'A curated contact sheet. Select a frame to explore.',
    list: 'The collection, frame by frame. Select a title or image to explore.',
    cover: 'One frame in focus. Use the arrows, select a side frame, or swipe to navigate.',
    pan: 'Drag in any direction. Use arrow keys to pan, or reset to return to the collection.',
    strip: 'Scroll through the collection. On touch screens, swipe the filmstrip horizontally.'
  };
  let mode='grid', index=0, filter='all', panX=0, panY=0, drag=null, suppressClickUntil=0, coverTouch=null;
  const visibleCards=()=>cards.filter(c=>!c.classList.contains('is-hidden'));
  const applyPan=()=>{panCanvas.style.transform=`translate(${panX}px,${panY}px)`;};
  function releaseDrag(){if(drag && grid.hasPointerCapture(drag.id))grid.releasePointerCapture(drag.id);drag=null;grid.classList.remove('is-dragging');}
  function announce(){announcement.textContent=`${visibleCards().length} portfolio projects. ${HELP[mode]}`;}
  function setMode(next,opts={}){
    if(!MODES.includes(next))return;
    SK.clearStrip?.(); releaseDrag(); coverTouch=null;
    const entering=next!==mode;
    mode=next; gallery.dataset.mode=mode;
    const empty=visibleCards().length===0;$('#galleryEmpty').hidden=!empty;grid.classList.toggle('is-empty',empty);
    grid.classList.remove('is-list','is-cover','is-pan','is-strip','is-grid');
    panCanvas.style.transform='';panX=panY=0;grid.scrollLeft=grid.scrollTop=0;
    gallery.classList.remove('is-pinned');
    cards.forEach(c=>{
      c.classList.remove('is-current');c.style.removeProperty('pointer-events');c.removeAttribute('tabindex');c.inert=c.classList.contains('is-hidden');
      ['--cx','--cr','--cl','--co','--cs','--cb','--px','--py','--pw','--ph'].forEach(k=>c.style.removeProperty(k));
    });
    $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));
    help.textContent=HELP[mode];steps.hidden=!['cover','pan','strip'].includes(mode);
    resetBtn.hidden=mode!=='pan';prevBtn.hidden=nextBtn.hidden=mode==='pan';
    prevBtn.disabled=nextBtn.disabled=false;
    grid.classList.add({grid:'is-grid',list:'is-list',cover:'is-cover',pan:'is-pan',strip:'is-strip'}[mode]);
    if(mode==='cover'){if(entering||opts.filtered)index=Math.floor(visibleCards().length/2);renderCover();}
    if(mode==='pan')renderPan();
    if(mode==='strip'){statusEl.textContent=`1 / ${visibleCards().length} · Filmstrip`;prevBtn.disabled=visibleCards().length<2;nextBtn.disabled=visibleCards().length<2;}
    SK.emit('galleryMode',{mode});SK.markStripDirty?.();if(!opts.silent)announce();
  }
  function renderCover(){
    const list=visibleCards(),n=list.length;index=SK.clamp(index,0,Math.max(0,n-1));
    const space=mobile.matches?150:220;
    list.forEach((card,i)=>{const off=i-index,d=Math.abs(off);
      card.style.setProperty('--cx',off*space+'px');card.style.setProperty('--cr',(off<0?40:off>0?-40:0)+'deg');
      card.style.setProperty('--cs',d===0?'1':'.8');card.style.setProperty('--cl',String(10-d));
      card.style.setProperty('--co',d>2?'0':String(1-d*.2));card.style.setProperty('--cb',d===0?'1':'.6');
      card.classList.toggle('is-current',d===0);card.inert=d>2;card.style.pointerEvents=d>2?'none':'';
      if(d>2)card.tabIndex=-1;
    });
    prevBtn.disabled=index===0;nextBtn.disabled=index>=n-1;statusEl.textContent=`${n?index+1:0} / ${n} · Cinema`;
  }
  function renderPan(){
    const desktop=[[-400,-200,240,300],[-100,-350,280,200],[250,-180,200,260],[-300,100,220,280]];
    const touch=[[-115,-90,230,280],[145,-220,230,180],[-270,170,200,260],[90,180,220,240]];
    visibleCards().forEach((card,i)=>{const[x,y,w,h]=(mobile.matches?touch:desktop)[i%4];
      card.style.setProperty('--px',grid.clientWidth/2+x+Math.floor(i/4)*650+'px');card.style.setProperty('--py',grid.clientHeight/2+y+Math.floor(i/4)*100+'px');
      card.style.setProperty('--pw',w+'px');card.style.setProperty('--ph',h+'px');
    });statusEl.textContent='Explore the archive';applyPan();
  }
  function step(d){
    if(mode==='cover'){index+=d;renderCover();return;}
    if(mode==='strip'){
      if(gallery.classList.contains('is-pinned'))SK.stepStrip?.(d);
      else grid.scrollBy({left:(visibleCards()[0]?.offsetWidth+32||300)*d,behavior:reduce.matches?'auto':'smooth'});
    }
  }
  prevBtn.addEventListener('click',()=>step(-1));nextBtn.addEventListener('click',()=>step(1));
  resetBtn.addEventListener('click',()=>{panX=panY=0;applyPan();});
  grid.addEventListener('click',e=>{
    const card=e.target.closest('.project');if(!card)return;
    if(performance.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();return;}
    if(mode==='cover'){const i=visibleCards().indexOf(card);if(i!==index){e.preventDefault();e.stopPropagation();index=i;renderCover();}}
  },true);
  grid.tabIndex=0;
  grid.addEventListener('keydown',e=>{
    if(mode==='pan'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();panX+=e.key==='ArrowLeft'?80:e.key==='ArrowRight'?-80:0;panY+=e.key==='ArrowUp'?80:e.key==='ArrowDown'?-80:0;applyPan();
    }else if(['cover','strip'].includes(mode)&&['ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();step(e.key==='ArrowRight'?1:-1);if(mode==='cover')visibleCards()[index]?.focus({preventScroll:true});
    }
  });
  grid.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(mode==='pan')drag={x:e.clientX,y:e.clientY,sx:panX,sy:panY,id:e.pointerId,moved:false};
    if(mode==='cover'&&e.pointerType!=='mouse')coverTouch={x:e.clientX,y:e.clientY};
  });
  window.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.hypot(dx,dy)>5){drag.moved=true;grid.classList.add('is-dragging');if(!grid.hasPointerCapture(e.pointerId))grid.setPointerCapture(e.pointerId);
      panX=drag.sx+dx;panY=drag.sy+dy;applyPan();e.preventDefault();}
  },{passive:false});
  window.addEventListener('pointerup',e=>{
    if(drag?.moved)suppressClickUntil=performance.now()+250;releaseDrag();
    if(coverTouch){const dx=e.clientX-coverTouch.x,dy=e.clientY-coverTouch.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){step(dx<0?1:-1);suppressClickUntil=performance.now()+250;}coverTouch=null;}
  });
  window.addEventListener('pointercancel',()=>{releaseDrag();coverTouch=null;});
  grid.addEventListener('dragstart',e=>{if(mode==='pan')e.preventDefault();});
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.view)));
  // Filters commit synchronously. The shared-element API belongs to project details,
  // not a whole-page snapshot that delays controls and captures unrelated Canvas effects.
  $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
    filter=b.dataset.filter;
    $$('[data-filter]').forEach(x=>{const active=x===b;x.classList.toggle('is-active',active);x.setAttribute('aria-pressed',String(active));});
    cards.forEach(card=>{const hide=filter!=='all'&&card.dataset.category!==filter;card.classList.toggle('is-hidden',hide);card.inert=hide;});
    $('#filterCount').textContent=String(visibleCards().length).padStart(2,'0');
    setMode(mode,{silent:true,filtered:true});updateOdometer();SK.emit('galleryFilter',{filter});announce();
  }));
  SK.gallery={get mode(){return mode;},get index(){return index;},get filter(){return filter;},visibleCards,setMode,step};
  window.addEventListener('resize',()=>{if(mode==='pan')renderPan();if(mode==='cover')renderCover();});
  setMode('grid',{silent:true});

  /* Odometer counts the frames actually visible, never invented numbers. */
  const odo = $('#odometer');
  let odoSeen = false;
  function updateOdometer() {
    if (!odo) return;
    const n = visibleCards().length, value = String(n).padStart(2, '0');
    if (!odo.children.length) {
      odo.textContent = '';
      [...value].forEach(() => {
        const digit = document.createElement('span'); digit.className = 'digit'; digit.setAttribute('aria-hidden','true');
        const strip = document.createElement('span'); strip.className = 'digit-strip';
        for (let k=0;k<10;k++) { const d=document.createElement('span'); d.textContent=k; strip.append(d); }
        digit.append(strip); odo.append(digit);
      });
    }
    [...odo.children].forEach((digit,i) => {
      const strip = digit.firstElementChild;
      strip.style.transitionDelay = reduce.matches ? '0s' : i * .12 + 's';
      strip.style.transform = `translateY(-${(odoSeen || reduce.matches ? Number(value[i]) : 0) * strip.firstElementChild.offsetHeight}px)`;
    });
    odo.setAttribute('aria-label', n + ' portfolio projects');
  }
  if ('IntersectionObserver' in window && odo) {
    const io = new IntersectionObserver((es,obs) => { if (!es[0].isIntersecting) return; odoSeen=true; updateOdometer(); obs.disconnect(); }, { rootMargin:'0px 0px -15% 0px' });
    io.observe(odo); coreCleanup.push(() => io.disconnect());
  } else odoSeen=true;
  window.addEventListener('resize', updateOdometer);
  reduce.addEventListener('change', updateOdometer);
  updateOdometer();
  document.fonts?.ready.then(updateOdometer);

  /* ── Project detail ────────────────────────────────────────────────────── */
  const pd = $('#projectDialog'), photo = $('#projectPhoto');
  const PROJECTS = {"1": {"title": "Behind the frame", "type": "Brand film", "src": "assets/hero-v2.webp", "alt": "AI-generated illustrative cinema camera and crew on a warmly lit soundstage", "copy": "A production-led visual concept emphasising the craft behind commercial storytelling \u2014 the set, the light and the people who build the frame.", "illustrative": true}, "0": {"title": "The human story", "type": "Film & drama", "src": "assets/portrait-v2.webp", "alt": "AI-generated illustrative portrait of a fictional actor in soft window light", "copy": "An atmospheric narrative concept built around human connection, tension and quiet emotion. A study in performance-led storytelling.", "illustrative": true}, "2": {"title": "Beyond the ordinary", "type": "Visual craft", "src": "assets/landscape-v2.webp", "alt": "AI-generated illustrative traveler on a rocky ridge before snowy mountains", "copy": "A landscape-driven visual concept exploring scale, atmosphere and the extraordinary \u2014 cinema that places a person inside the world.", "illustrative": true}, "3": {"title": "Made on set", "type": "Film production", "src": "assets/stage-v2.webp", "alt": "AI-generated illustrative crew filming an interior soundstage scene", "copy": "A behind-the-scenes concept centred on collaboration and the filmmaking process, from the first mark on the floor to the final take.", "illustrative": true}};
  const order = cards.map(c => Number(c.dataset.project));

  let projectOrigin=null,projectTransition=null,projectVersion=0,projectTarget=null,projectClosing=false;
  const clearFilmNames=()=>{photo.style.viewTransitionName='';cards.forEach(c=>c.querySelector('img').style.viewTransitionName='');};
  const listForProject=()=>visibleCards().map(c=>Number(c.dataset.project));
  function transitionProject(update,source,target){
    const version=++projectVersion;projectTransition?.skipTransition();clearFilmNames();
    const apply=()=>{if(version!==projectVersion)return;update();if(target?.isConnected)target.style.viewTransitionName='film';};
    const canMorph=!reduce.matches&&document.startViewTransition&&source?.offsetWidth;
    if(!canMorph){update();return;}
    source.style.viewTransitionName='film';
    try{
      const vt=document.startViewTransition(()=>{if(version!==projectVersion)return;source.style.viewTransitionName='';apply();});
      projectTransition=vt;
      vt.ready.catch(()=>{});
      vt.updateCallbackDone.catch(()=>{if(version===projectVersion)update();});
      vt.finished.catch(()=>{}).finally(()=>{if(projectTransition===vt){clearFilmNames();projectTransition=null;projectClosing=false;}});
    }catch{clearFilmNames();update();projectClosing=false;}
  }
  function openProject(id,card){
    const item=PROJECTS[id];if(!item)return;
    projectClosing=false;projectTarget=id;projectOrigin=card||cards.find(c=>Number(c.dataset.project)===id);
    const list=listForProject(),pos=list.indexOf(id),wasOpen=pd.open;
    pd.dataset.current=String(id);pd.dataset.list=list.join(',');
    $('#projectPrev').disabled=pos<=0;$('#projectNext').disabled=pos>=list.length-1;
    const render=()=>{
      photo.src=item.src;photo.alt=item.alt;photo.width=1330;
      photo.style.objectPosition=projectOrigin?.style.getPropertyValue('--crop')||'50% 50%';
      photo.classList.remove('full-frame');$('#frameFit').setAttribute('aria-pressed','false');$('#frameFit').textContent='View full frame';
      $('#projectTitle').textContent=item.title;$('#projectType').textContent=item.type;$('#projectDescription').textContent=item.copy;
      $('.project-detail-copy>.note').hidden=item.illustrative===false;
      $('.project-detail-copy>.label').textContent=item.illustrative===false?'Portfolio / Film & visual craft':'A cinematic concept / Illustrative collection';
      $('#projectIndex').textContent=`${String(pos+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;
      if(!pd.open){pd.showModal();pd.scrollTop=0;pd.classList.add('dialog-enter');}
    };
    if(wasOpen){
      // Commit in-dialog navigation immediately; overlapping native snapshots can
      // outlive rapid key presses. Opening and closing retain the shared image.
      projectVersion++;projectTransition?.skipTransition();projectTransition=null;clearFilmNames();render();
      pd.classList.remove('dialog-enter');void pd.offsetWidth;pd.classList.add('dialog-enter');return;
    }
    transitionProject(render,projectOrigin?.querySelector('img'),photo);
  }
  cards.forEach(card=>card.addEventListener('click',()=>openProject(Number(card.dataset.project),card)));
  function closeProject(){
    if(!pd.open||projectClosing)return;projectClosing=true;
    const target=projectOrigin?.querySelector('img');
    const done=()=>{pd.close();projectClosing=false;projectOrigin?.focus({preventScroll:true});};
    transitionProject(done,photo,target);
  }
  pd.addEventListener('cancel',e=>{e.preventDefault();closeProject();});
  pd.addEventListener('close',()=>{pd.classList.remove('dialog-enter');photo.style.viewTransitionName='';});
  function moveProject(d){const list=listForProject(),i=list.indexOf(projectTarget),next=list[i+d];if(next!==undefined)openProject(next);}
  $('#projectPrev').addEventListener('click',()=>moveProject(-1));$('#projectNext').addEventListener('click',()=>moveProject(1));
  pd.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();moveProject(e.key==='ArrowRight'?1:-1);}});
  $('#frameFit').addEventListener('click',e=>{const full=photo.classList.toggle('full-frame');e.currentTarget.setAttribute('aria-pressed',String(full));e.currentTarget.textContent=full?'View crop':'View full frame';});

  /* ── Video player ─────────────────────────────────────────────────────── */
  const player = $('#player'), reelVideo = $('#reelVideo');
  $$('[data-reel]').forEach(b => b.addEventListener('click', () => {
    $('#playerError').hidden = true;
    reelVideo.muted = true; // Sound is enabled deliberately through native controls.
    reelVideo.src = VIDEO;
    player.showModal();
    reelVideo.play().catch(() => {});
  }));
  reelVideo.addEventListener('error', () => { if (player.open) $('#playerError').hidden = false; });
  player?.addEventListener('close', () => {
    reelVideo.pause();
    reelVideo.removeAttribute('src');
    reelVideo.load();
  });

  /* ── Dialog helpers ───────────────────────────────────────────────────── */
  $$('[data-close]').forEach(b => b.addEventListener('click', () => { const d = b.closest('dialog'); d === pd ? closeProject() : d?.close(); }));
  [player, pd].forEach(d => d?.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { if (d === pd) closeProject(); else d.close(); }
  }));
  function closeAllDialogs() { [pd, player, intro].forEach(d => { if (d?.open) d.close(); }); }

  /* ── Enquiry form ─────────────────────────────────────────────────────── */
  const note = $('#formNote');
  const submitBtn = $('#submitBtn');
  const FIELDS = [
    { id: 'f-name', err: 'e-name', test: v => v.trim().length >= 2 ? '' : 'Please enter your name.' },
    { id: 'f-email', err: 'e-email', test: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.' },
    { id: 'f-type', err: 'e-type', test: v => v ? '' : 'Please choose a project type.' },
    { id: 'f-brief', err: 'e-brief', test: v => v.trim().length >= 20 ? '' : 'Please describe the project in at least 20 characters.' }
  ];
  function validateField(f, show = true) {
    const input = $('#' + f.id), wrap = input.closest('.field'), msg = $('#' + f.err);
    const error = f.test(input.value);
    if (show) {
      wrap.classList.toggle('has-error', !!error);
      input.setAttribute('aria-invalid', String(!!error));
      msg.textContent = error;
    }
    return !error;
  }
  FIELDS.forEach(f => {
    const input = $('#' + f.id);
    input.addEventListener('blur', () => { if (input.value !== '' || input.dataset.touched) validateField(f); input.dataset.touched = '1'; });
    input.addEventListener('input', () => { if (input.closest('.field').classList.contains('has-error')) validateField(f); });
    input.addEventListener('change', () => { if (f.id === 'f-type') validateField(f); });
  });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const ok = FIELDS.map(f => validateField(f, true)).every(Boolean);
    if (!ok) {
      note.className = 'form-note is-error';
      note.textContent = 'Please check the highlighted fields and try again.';
      const firstBad = FIELDS.find(f => $('#' + f.id).getAttribute('aria-invalid') === 'true');
      if (firstBad) $('#' + firstBad.id).focus();
      return;
    }
    const data = new FormData(form);
    const val = k => (data.get(k) || '').toString().trim() || '—';
    const content = [
      'SK FILMS PRODUCTIONS / PROJECT BRIEF',
      'Prepared locally. Not sent to SK Films.',
      '',
      'Name: ' + val('name'),
      'Email: ' + val('email'),
      'Company: ' + val('company'),
      'Project type: ' + val('type'),
      'Estimated budget: ' + val('budget'),
      'Timeline: ' + val('timeline'),
      '',
      'About the project:',
      val('brief')
    ].join('\n');

    let ok2 = true;
    try {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'SK-Films-Project-Brief.txt';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { ok2 = false; }

    if (!ok2) {
      note.className = 'form-note is-error';
      note.textContent = 'The brief could not be prepared on this device. Please copy your details and email them to SK Films directly.';
      return;
    }
    note.className = 'form-note is-success';
    note.textContent = 'Your brief is ready to save. Nothing has been sent to SK Films.';
    $('#briefSuccess').hidden = false;
    submitBtn.classList.add('is-sent');
    setTimeout(() => submitBtn.classList.remove('is-sent'), 2400);
    /* Success feedback only after the download actually started. */
    document.dispatchEvent(new CustomEvent('sk:brief-success'));
  });

  $('#editBrief')?.addEventListener('click', () => { $('#briefSuccess').hidden = true; $('#f-name').focus(); });


  /* ── Reveal-on-view for editorial blocks ──────────────────────────────── */
  if ('IntersectionObserver' in window && !reduce.matches) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in-view');
      io.unobserve(en.target);
    }), { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    $$('.manifesto').forEach(el => {
      el.classList.add('motion-enter');
      io.observe(el);
    });
  } else {
    $$('.manifesto').forEach(el => el.classList.add('in-view'));
  }

  window.addEventListener('pagehide', e => { opening.pause(); reelVideo.pause(); clearTimeout(brokenTimer); clearTimeout(closeTimer); if (!e.persisted) coreCleanup.forEach(fn => fn()); });
  window.addEventListener('pageshow', e => {
    if (!e.persisted || !intro.open) return;
    if (closing) { closing=false; closeIntro(true); }
    else fallback.hidden=false;
  });
  SK.isReady = true;
  SK.ready = true;
  document.dispatchEvent(new CustomEvent('sk:ready'));
})();
