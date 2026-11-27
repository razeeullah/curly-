/* SK Films — source-derived cinematic motion.
 * Adapted from Jay / RoboLabs' Cinematic Site Modules (MIT).
 * Original mechanisms and intentional deviations: ANIMATION_AUDIT.md.
 * Core controls remain in script.js; a missing GSAP never blocks the site.
 */
(() => {
  'use strict';
  const SK = window.SK;
  if (!SK) return;
  const { $, $$, reduce, fine, clamp } = SK;
  const cleanup = [], loops = [], timers = new Set();
  const root = document.documentElement, body = document.body;
  let raf = 0, lastTime = 0, destroyed = false, globallyPaused = false;
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const names = ['text-mask','sticky-stack','zoom-parallax','horizontal-scroll','sticky-cards','svg-draw','curtain-reveal','split-scroll','color-shift','cursor-reactive','accordion-slider','cursor-reveal','image-trail','flip-cards','magnetic-grid','spotlight-border','drag-pan','view-transitions','particle-button','odometer','coverflow','dynamic-island','dock-nav','text-scramble','kinetic-marquee','mesh-gradient','circular-text','glitch-effect','typewriter','gradient-stroke'];
  SK.motion = { components: names, sourceVersion: 'RoboLabs / supplied HTML', get paused() { return globallyPaused; } };
  function on(el, type, fn, options) {
    if (!el) return;
    el.addEventListener(type, fn, options);
    cleanup.push(() => el.removeEventListener(type, fn, options));
  }
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, ms);
    timers.add(id); return id;
  }
  function visible(el) {
    if (!el) return () => false;
    let active = false;
    const io = new IntersectionObserver(entries => {
      active = entries[0].isIntersecting;
      el.classList.toggle('motion-visible', active); wake();
    });
    io.observe(el); cleanup.push(() => io.disconnect());
    return () => active;
  }
  function frame(t) {
    raf = 0;
    if (destroyed || document.hidden || reduce.matches || globallyPaused) { lastTime=0; return; }
    const dt = lastTime ? Math.min((t-lastTime)/1000, .05) : 1/60;
    lastTime = t;
    let running = false;
    loops.forEach(loop => { if (loop.active()) { loop.tick(dt,t); running = true; } });
    if (running) raf = requestAnimationFrame(frame); else lastTime=0;
  }
  function wake() { if (!raf && !destroyed && !document.hidden && !reduce.matches && !globallyPaused) raf = requestAnimationFrame(frame); }
  function loop(active,tick) { loops.push({active,tick}); wake(); }
  on(document,'visibilitychange', () => { body.classList.toggle('motion-hidden',document.hidden); wake(); });
  on(reduce,'change', () => {
    body.classList.toggle('motion-reduced', reduce.matches);
    if (reduce.matches) {
      $$('.trail-still,.particle,.particle-ring').forEach(el => el.remove());
      $$('.project-media,.magnetic').forEach(el => el.style.transform='');
    }
    wake();
  });

  // A single explicit ambient pause covers typewriter, rings, mesh and marquee.
  const motionToggle = document.createElement('button');
  motionToggle.type='button'; motionToggle.className='motion-toggle'; motionToggle.textContent='Pause motion';
  motionToggle.setAttribute('aria-pressed','false'); $('.footer-links')?.append(motionToggle);
  on(motionToggle,'click', () => {
    globallyPaused=!globallyPaused; body.classList.toggle('motion-paused',globallyPaused);
    motionToggle.textContent=globallyPaused?'Resume motion':'Pause motion';
    motionToggle.setAttribute('aria-pressed',String(globallyPaused)); wake();
  });

  // 11 Accordion. CSS retains source flex 1→5 / 600ms; pointer selection is synchronized.
  const chapters = $$('[data-chapter]'), counter = $('#chapterCount');
  const titles = ['Behind the frame','The human story','Beyond the ordinary','Made on set'];
  let selected=0, glitchTimer;
  function glitch() {
    if (reduce.matches) return;
    counter.dataset.glitch=counter.textContent;
    counter.classList.remove('is-glitching'); void counter.offsetWidth;
    counter.classList.add('is-glitching'); clearTimeout(glitchTimer);
    glitchTimer=later(() => counter.classList.remove('is-glitching'),400);
  }
  function selectChapter(i) {
    if (i===selected) return;
    selected=i;
    chapters.forEach((b,n) => { b.classList.toggle('is-active',n===i); b.setAttribute('aria-pressed',String(n===i)); });
    counter.textContent=String(i+1).padStart(2,'0');
    $('#frameDescription').textContent=String(i+1).padStart(2,'0')+' — '+titles[i];
    $('#frameAnnounce').textContent='Frame '+(i+1)+' of 4: '+titles[i];
    glitch();
  }
  chapters.forEach((b,i) => {
    on(b,'click',() => selectChapter(i));
    on(b,'pointermove',e => { if (fine.matches && e.pointerType==='mouse') selectChapter(i); });
    on(b,'focus',() => selectChapter(i));
  });
  on($('.chapter-rail'),'keydown',e => {
    const vertical=innerWidth<=760;
    if (!['ArrowLeft','ArrowRight',...(vertical?['ArrowUp','ArrowDown']:[])].includes(e.key)) return;
    e.preventDefault(); const next=(selected+(['ArrowRight','ArrowDown'].includes(e.key)?1:3))%4;
    selectChapter(next); chapters[next].focus({preventScroll:true});
  });
  on(counter,'pointerenter',glitch);

  // 10 Cursor environment — source .12 glow interpolation, perspective 600 / ±6°.
  const screen=$('.hero-screen'), glow=$('.hero-glow'), heroVisible=visible(screen);
  let mx=0,my=0,gx=0,gy=0,hasPoint=false;
  on(screen,'pointermove',e => {
    if (!fine.matches || e.pointerType!=='mouse') return;
    const r=screen.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top; hasPoint=true; wake();
  },{passive:true});
  on(screen,'pointerleave',() => { hasPoint=false; });
  loop(() => heroVisible() && fine.matches && hasPoint,dt => {
    const k=1-Math.pow(1-.12,dt*60); gx+=(mx-gx)*k; gy+=(my-gy)*k;
    glow.style.transform=`translate(${gx-250}px,${gy-250}px)`;
  });
  $$('.project').forEach(card => {
    const media=$('.project-media',card);
    on(card,'pointermove',e => {
      if (!fine.matches || reduce.matches || SK.gallery.mode!=='grid') return;
      const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      media.style.transform=`perspective(600px) rotateY(${x*12}deg) rotateX(${-y*12}deg) scale(1.02)`;
      media.style.setProperty('--spot-x',e.clientX-r.left+'px'); media.style.setProperty('--spot-y',e.clientY-r.top+'px');
    },{passive:true});
    on(card,'pointerleave',() => { media.style.transform=''; });
  });
  $$('.magnetic').forEach(btn => {
    on(btn,'pointermove',e => {
      if (!fine.matches || reduce.matches) return;
      const r=btn.getBoundingClientRect();
      btn.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.3}px,${(e.clientY-r.top-r.height/2)*.3}px)`;
    });
    on(btn,'pointerleave',() => { btn.style.transform=''; });
  });
  const rippleArea=$('.reel-screen'), rippleCanvas=document.createElement('canvas');
  rippleCanvas.className='ripple-canvas'; rippleCanvas.setAttribute('aria-hidden','true'); rippleArea.append(rippleCanvas);
  const ripples=[], rctx=rippleCanvas.getContext('2d');
  function sizeRipple(){rippleCanvas.width=rippleArea.clientWidth;rippleCanvas.height=rippleArea.clientHeight;}
  sizeRipple();on(window,'resize',sizeRipple);
  on(rippleArea,'pointerdown',e => {
    if (reduce.matches) return;
    const r=rippleArea.getBoundingClientRect(); ripples.push({x:e.clientX-r.left,y:e.clientY-r.top,r:0,alpha:.5}); wake();
  });
  loop(() => ripples.length>0,dt => {
    rctx.clearRect(0,0,rippleCanvas.width,rippleCanvas.height);
    for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.r+=4*dt*60;r.alpha-=.006*dt*60;
      if(r.alpha<=0){ripples.splice(i,1);continue;}
      rctx.beginPath();rctx.arc(r.x,r.y,r.r,0,Math.PI*2);rctx.strokeStyle=`rgba(212,160,23,${r.alpha})`;rctx.lineWidth=1.5;rctx.stroke();
    }
  });

  // 12 Horizontal compare: source clipping equation, deliberate drag and keyboard range.
  const grade=$('#gradeVisual'), range=$('#gradeRange'); let comparing=false;
  const setGrade=v => { range.value=String(Math.round(clamp(v,0,100)));grade.style.setProperty('--wipe',range.value+'%');range.setAttribute('aria-valuetext',range.value+' percent monochrome, '+(100-range.value)+' percent warm grade'); };
  on(range,'input',() => setGrade(+range.value));
  on(grade,'pointerdown',e => { comparing=true; grade.setPointerCapture(e.pointerId); const r=grade.getBoundingClientRect();setGrade((e.clientX-r.left)/r.width*100); });
  on(grade,'pointermove',e => { if (!comparing) return; const r=grade.getBoundingClientRect();setGrade((e.clientX-r.left)/r.width*100); });
  on(grade,'pointerup',() => {comparing=false;});on(grade,'pointercancel',() => {comparing=false;});
  setGrade(50);

  // 13 Image trail — source pool=20, threshold=60, random rotations and delayed 800ms fade.
  const trailAreas=$$('.motion-trail'); let pool=[],trailIndex=0,lastX=0,lastY=0;
  function ensureTrail(){
    if(pool.length && pool[0].isConnected)return;
    pool=Array.from({length:20},(_,i)=>{const el=document.createElement('img');el.className='trail-still';el.alt='';el.setAttribute('aria-hidden','true');el.src='assets/'+['story-v2.webp','landscape-v2.webp','camera-v2.webp','portrait-v2.webp','hero-v2.webp','stage-v2.webp'][i%6];body.append(el);return el;});
  }
  function spawnTrail(x,y){
    if(reduce.matches)return;ensureTrail();const el=pool[trailIndex++%20];
    el.style.left=x-80+'px';el.style.top=y-100+'px';
    el.style.transition='none';el.style.opacity='.85';el.style.transform=`scale(.8) rotate(${Math.random()*20-10}deg)`;void el.offsetHeight;
    el.style.transition='opacity .8s ease .3s, transform .8s ease';el.style.opacity='0';el.style.transform=`scale(.6) rotate(${Math.random()*30-15}deg)`;
  }
  trailAreas.forEach(trail=>{on(trail,'pointermove',e=>{if(!fine.matches||reduce.matches)return;if(Math.hypot(e.clientX-lastX,e.clientY-lastY)>60){lastX=e.clientX;lastY=e.clientY;spawnTrail(lastX,lastY);}});
  on(trail,'pointerdown',e=>{if(e.pointerType==='touch')spawnTrail(e.clientX,e.clientY);});});
  cleanup.push(()=>pool.forEach(el=>el.remove()));

  // 14 Native button semantics + source perspective, hover and persistent tap states.
  $$('.role').forEach(btn=>{
    on(btn,'click',()=>{const pressed=btn.getAttribute('aria-pressed')!=='true';btn.setAttribute('aria-pressed',String(pressed));});
  });

  // 16 Shared grid coordinates; every neighboring service receives cursor location.
  const services=$('#services');
  on(services,'pointermove',e=>{
    if(reduce.matches||!fine.matches)return;
    $$('.service',services).forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty('--sx',e.clientX-r.left+'px');el.style.setProperty('--sy',e.clientY-r.top+'px');});
    services.classList.add('spotlight-active');
  },{passive:true});
  on(services,'pointerleave',()=>services.classList.remove('spotlight-active'));
  $$('.service').forEach(el=>on(el,'toggle',()=>refresh()));

  // Retain existing editorial hover previews in service and list views.
  const preview=document.createElement('img');preview.className='editorial-preview';preview.alt='';preview.setAttribute('aria-hidden','true');body.append(preview);
  function showPreview(src,e){
    if(!fine.matches||reduce.matches)return;
    if(preview.getAttribute('src')!==src)preview.src=src;
    const x=clamp(e.clientX+150,150,innerWidth-150),y=clamp(e.clientY,120,innerHeight-120);
    preview.style.left=x+'px';preview.style.top=y+'px';preview.classList.add('visible');
  }
  on(services,'pointermove',e=>{const row=e.target.closest('.service');if(row)showPreview(row.dataset.image,e);});
  on(services,'pointerleave',()=>preview.classList.remove('visible'));
  on($('#projects'),'pointermove',e=>{if(SK.gallery.mode!=='list')return;const card=e.target.closest('.project');if(card)showPreview($('img',card).getAttribute('src'),e);});
  on($('#projects'),'pointerleave',()=>preview.classList.remove('visible'));
  cleanup.push(()=>preview.remove());

  // 15 Distance field with the reference radius 120 and maximum force 18.
  const field=$('.magnet-field'), statement=$('.contact-statement');let fieldPoint=null;
  const dots=Array.from({length:96},()=>{const d=document.createElement('span');d.className='magnet-dot';field.append(d);return d;});
  on($('#contact'),'pointermove',e=>{if(!reduce.matches){fieldPoint={x:e.clientX,y:e.clientY};wake();}},{passive:true});
  on($('#contact'),'pointerdown',e=>{fieldPoint={x:e.clientX,y:e.clientY};wake();later(()=>{fieldPoint=null;dots.forEach(d=>d.style.transform='');},700);});
  on($('#contact'),'pointerleave',()=>{fieldPoint=null;dots.forEach(d=>d.style.transform='');});
  const fieldVisible=visible(field);
  loop(()=>fieldVisible()&&!!fieldPoint,()=>{
    const rects=dots.map(d=>d.getBoundingClientRect());
    dots.forEach((d,i)=>{
      const r=rects[i];if(!r.width)return;
      const dx=r.left+r.width/2-fieldPoint.x,dy=r.top+r.height/2-fieldPoint.y,dist=Math.hypot(dx,dy);
      const force=Math.max(0,1-dist/120)*18,angle=Math.atan2(dy,dx);
      d.style.transform=`translate(${Math.cos(angle)*force}px,${Math.sin(angle)*force}px)`;
    });
  });

  // 22 The island itself morphs; it no longer proxies the fullscreen menu.
  const island=$('#island'), islandToggle=$('#islandToggle'), islandLinks=$('#islandLinks');
  function setIsland(open,restore=false){island.classList.toggle('expanded',open);islandToggle.setAttribute('aria-expanded',String(open));islandLinks.inert=!open;if(!open&&restore)islandToggle.focus({preventScroll:true});}
  SK.closeIsland=()=>setIsland(false);
  on(islandToggle,'click',()=>setIsland(!island.classList.contains('expanded')));
  $$('.island-content a').forEach(a=>on(a,'click',()=>setIsland(false)));
  on(document,'keydown',e=>{if(e.key==='Escape'&&island.classList.contains('expanded'))setIsland(false,true);});
  on(document,'pointerdown',e=>{if(!island.contains(e.target))setIsland(false);});
  on(island,'focusout',e=>{if(!island.contains(e.relatedTarget))setIsland(false);});

  // 23 Source dock: width/height 48→72; neighboring items move with real layout.
  const dock=$('#dock'),dockItems=$$('a',dock);
  function resetDock(){dockItems.forEach(a=>{a.style.width='48px';a.style.height='48px';});}
  on(dock,'pointermove',e=>{
    if(!fine.matches||reduce.matches)return;
    const rects=dockItems.map(a=>a.getBoundingClientRect());
    dockItems.forEach((a,i)=>{const dist=Math.abs(e.clientX-rects[i].left-rects[i].width/2),size=dist>120?48:Math.max(48,72-dist/120*24);a.style.width=a.style.height=size+'px';});
  });
  on(dock,'pointerleave',resetDock);resetDock();

  // 24 Reference scramble thresholds: (index/length)*.7+.15, 1200ms.
  function scramble(el){
    const text=el.textContent,chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    const view=document.createElement('span');view.setAttribute('aria-hidden','true');
    el.setAttribute('aria-label',text);el.replaceChildren(view);
    let start=null;
    function draw(t){if(destroyed)return;if(start===null)start=t;const p=reduce.matches?1:Math.min((t-start)/1200,1);
      let i=0;
      view.replaceChildren(...text.split(/(\s+)/).filter(Boolean).map(word=>{
        const group=document.createElement('span');group.className=/^\s+$/.test(word)?'scramble-space':'scramble-word';
        [...word].forEach(c=>{const span=document.createElement('span');const resolved=p>=i/text.length*.7+.15;i++;span.className='scramble-char '+(resolved?'resolved':'scrambling');span.textContent=c===' '?' ':resolved?c:chars[Math.floor(Math.random()*chars.length)];group.append(span);});return group;
      }));
      if(p<1)scrambleFrame=requestAnimationFrame(draw);
    }
    scrambleFrame=requestAnimationFrame(draw);
  }
  let scrambleFrame=0;
  const scrambleTarget=$('[data-scramble]');
  const sio=new IntersectionObserver(es=>{if(es[0].isIntersecting){if(!reduce.matches)scramble(scrambleTarget);sio.disconnect();}},{rootMargin:'0px 0px -20% 0px'});
  sio.observe(scrambleTarget);cleanup.push(()=>{sio.disconnect();cancelAnimationFrame(scrambleFrame);});

  // 29 Source cycler: type 60ms, delete 30ms, 40-frame hold, 400ms interphrase.
  const type=$('[data-typewriter]'), phrases=['SK Films Productions','Stories shaped in light.','Made to be felt.'];
  type.setAttribute('aria-label','SK Films Productions');
  const typeView=document.createElement('span');typeView.setAttribute('aria-hidden','true');typeView.textContent=phrases[0];type.replaceChildren(typeView);
  let pi=0,ci=0,deleting=false,pause=0,typeStarted=false,typeClock=0,typeGap=0;
  const typeVisible=visible($('.hero-bottom'));
  function startType(){if(typeStarted||reduce.matches)return;typeStarted=true;typeView.textContent='';typeView.classList.add('is-typing');wake();}
  cleanup.push(SK.onIntro(name=>{if(name==='introEnd')later(startType,180);}));
  if(!$('#intro').open)later(startType,400);
  loop(()=>typeStarted&&typeVisible()&&!$('#intro').open,dt=>{
    if(typeGap>0){typeGap-=dt*1000;return;}
    const phrase=phrases[pi];
    if(!deleting&&ci>phrase.length){pause+=dt*60;if(pause>40){deleting=true;pause=0;}return;}
    typeClock+=dt*1000;const interval=deleting?30:60;if(typeClock<interval)return;typeClock-=interval;
    ci+=deleting?-1:1;
    if(ci<0){ci=0;deleting=false;pi=(pi+1)%phrases.length;typeGap=400;return;}
    typeView.textContent=phrase.substring(0,ci);
  });
  on(reduce,'change',()=>{if(reduce.matches){typeView.textContent=phrases[0];typeView.classList.remove('is-typing');}else{typeStarted=false;startType();}});

  // 25 User-requested calmer marquee: 40px/s, capped at 52px/s during scroll.
  const band=$('.kinetic-band'),track=$('.kinetic-track'),pauseBand=$('.band-pause');
  const bandVisible=visible(band);let bandPaused=false,x=0,velocity=0;
  loop(()=>bandVisible()&&!bandPaused,dt=>{
    const w=track.firstElementChild.getBoundingClientRect().width;if(!w)return;
    const speed=40+Math.min(12,velocity*.008);
    x=(x+speed*dt)%w;track.style.transform=`translate3d(${-x}px,0,0)`;
    velocity*=Math.exp(-4*dt);
  });
  on(pauseBand,'click',()=>{bandPaused=!bandPaused;pauseBand.textContent=bandPaused?'Resume motion':'Pause motion';pauseBand.setAttribute('aria-pressed',String(bandPaused));wake();});

  // 26 Canvas mesh, source radial gradients + lighter compositing and four moving blobs.
  const mesh=$('#meshCanvas'),contact=$('#contact'),ctx=mesh.getContext('2d'),meshVisible=visible(contact);let meshPaused=false;
  const colors=['rgba(212,160,23,.25)','rgba(170,143,95,.2)','rgba(130,119,101,.2)','rgba(190,181,158,.12)'];
  const blobs=colors.map(color=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:.3+Math.random()*.2,color}));
  let meshVirtualWidth=1,meshVirtualHeight=1;
  function sizeMesh(){const w=contact.clientWidth,h=contact.clientHeight;meshVirtualWidth=w*2;meshVirtualHeight=h*2;const scale=Math.min(2,Math.sqrt(1500000/Math.max(1,w*h)));mesh.width=Math.round(w*scale);mesh.height=Math.round(h*scale);drawMesh(0);}
  function drawMesh(dt){const w=mesh.width,h=mesh.height;if(!w||!h)return;ctx.clearRect(0,0,w,h); // Transparent light-theme canvas; retain additive blob blending.
    blobs.forEach(b=>{b.x+=b.vx/meshVirtualWidth*dt*60;b.y+=b.vy/meshVirtualHeight*dt*60;if(b.x<-.2||b.x>1.2)b.vx*=-1;if(b.y<-.2||b.y>1.2)b.vy*=-1;
      const g=ctx.createRadialGradient(b.x*w,b.y*h,0,b.x*w,b.y*h,b.r*Math.max(w,h));g.addColorStop(0,b.color);g.addColorStop(1,'transparent');ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';});
  }
  sizeMesh();const meshResize=new ResizeObserver(sizeMesh);meshResize.observe(contact);cleanup.push(()=>meshResize.disconnect());
  loop(()=>meshVisible()&&!meshPaused,drawMesh);
  on($('.mesh-toggle'),'click',e=>{meshPaused=!meshPaused;e.currentTarget.setAttribute('aria-pressed',String(meshPaused));e.currentTarget.textContent=meshPaused?'Resume background motion':'Pause background motion';wake();});

  // 30 A time-based gradient transform keeps the SVG outline pauseable/offscreen-aware.
  const reelVisible=visible(rippleArea);let strokeTime=0;
  loop(reelVisible,dt=>{strokeTime=(strokeTime+dt)%6;$('#goldStroke').setAttribute('gradientTransform','translate('+(strokeTime/6*1800)+' 0)');});

  // 19 Source particle trajectories (20 / 40..120px / -40px lift) and expanding ring.
  on(document,'sk:brief-success',()=>{
    if(reduce.matches)return;
    const r=$('#submitBtn').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    for(let i=0;i<20;i++){const p=document.createElement('i');p.className='particle';p.setAttribute('aria-hidden','true');p.style.left=cx+'px';p.style.top=cy+'px';body.append(p);
      const a=Math.random()*Math.PI*2,d=40+Math.random()*80;void p.offsetHeight;p.style.transform=`translate(${Math.cos(a)*d}px,${Math.sin(a)*d-40}px) scale(0)`;p.style.opacity='0';later(()=>p.remove(),700);
    }
    const ring=document.createElement('i');ring.className='particle-ring';ring.setAttribute('aria-hidden','true');ring.style.left=cx+'px';ring.style.top=cy+'px';body.append(ring);void ring.offsetHeight;ring.classList.add('expanded');later(()=>ring.style.opacity='0',200);later(()=>ring.remove(),600);
  });

  // Narrative visual states are loaded once and crossfade using source 500ms opacity.
  const photo=$('.process-photo'),processImage=$('#processImage');
  const stages=[['story-v2.webp','Concept development'],['stage-v2.webp','Pre-production'],['hero-v2.webp','Production'],['camera-v2.webp','Post-production'],['landscape-v2.webp','Delivery']];
  const stateImages=stages.map(([src,title],i)=>{
    const img=i===0?processImage:document.createElement('img');
    img.src='assets/'+src;img.alt='Illustrative production frame — '+title;img.classList.add('process-state');img.classList.toggle('active',i===0);if(i>0){img.loading='lazy';photo.insertBefore(img,$('#processLabel'));}return img;
  });
  function activateStage(i){
    // ScrollTrigger can enter synchronously during setup, before these arrays exist.
    if(!photo || !photo.isConnected)return;
    $$('.process-state').forEach((el,n)=>{el.classList.toggle('active',n===i);el.setAttribute('aria-hidden',String(n!==i));});
    $$('.step').forEach((el,n)=>el.classList.toggle('active',n===i));
    $('#processLabel').textContent=String(i+1).padStart(2,'0')+' / '+stages[i][1];
  }
  // Context initialization may have preceded visual state construction; initialize the first state.
  activateStage(0);

  const narrativeFeatures=$$('.narrative-feature'), narrativeStates=$$('.narrative-state');
  function activateNarrative(i){
    narrativeFeatures.forEach((el,n)=>el.classList.toggle('active',n===i));
    narrativeStates.forEach((el,n)=>{el.classList.toggle('active',n===i);el.setAttribute('aria-hidden',String(n!==i));});
    $('#narrativeLabel').textContent=String(i+1).padStart(2,'0')+' / '+['Story','Image','People','Rhythm'][i];
  }

  // Source-derived scroll effects, isolated in a GSAP media context.
  let mm=null,stripTween=null,refreshTimer=0;
  function refresh(){clearTimeout(refreshTimer);refreshTimer=later(()=>{ST?.refresh();},100);}
  function clearStrip(){stripTween?.scrollTrigger?.kill();stripTween?.kill();stripTween=null;const g=$('#gallery');g.classList.remove('is-pinned');g.style.removeProperty('--pin-height');$('.pan-canvas').style.transform='';}
  SK.clearStrip=clearStrip;
  SK.markStripDirty=()=>{buildStrip();refresh();};
  SK.stepStrip=d=>{if(!stripTween)return;const t=stripTween.scrollTrigger,n=SK.gallery.visibleCards().length;const progress=clamp(t.progress+d/Math.max(1,n-1));window.scrollTo({top:t.start+progress*(t.end-t.start),behavior:reduce.matches?'instant':'smooth'});};
  function updateStripStatus(p=0){const n=SK.gallery.visibleCards().length;$('#galleryProgressFill').style.width=(p*100)+'%';$('#galleryStatus').textContent=`${Math.min(Math.ceil(p*n+.5),n)} / ${n} · Filmstrip`;$('#galleryPrev').disabled=p<=.001;$('#galleryNext').disabled=p>=.999||n<2;}
  function buildStrip(){
    clearStrip();
    if(SK.gallery.mode!=='strip')return;
    const gallery=$('#gallery'),grid=$('#projects'),canvas=$('.pan-canvas'),n=SK.gallery.visibleCards().length;
    grid.scrollLeft=0;updateStripStatus(0);
    if(!gsap||!ST||innerWidth<=900||reduce.matches)return;
    const distance=Math.max(0,canvas.scrollWidth-grid.clientWidth);if(!distance){$('#galleryPrev').disabled=$('#galleryNext').disabled=true;return;}
    gallery.classList.add('is-pinned');gallery.style.setProperty('--pin-height',n*100+'svh');
    stripTween=gsap.to(canvas,{x:()=>-Math.max(0,canvas.scrollWidth-grid.clientWidth),ease:'none',scrollTrigger:{trigger:gallery,start:'top top',end:'bottom bottom',scrub:.5,invalidateOnRefresh:true,onUpdate:self=>updateStripStatus(self.progress)}});
  }
  on($('#projects'),'scroll',()=>{if(SK.gallery.mode==='strip'&&!$('#gallery').classList.contains('is-pinned')){const g=$('#projects');updateStripStatus(g.scrollLeft/Math.max(1,g.scrollWidth-g.clientWidth));}},{passive:true});
  if(gsap&&ST){
    gsap.registerPlugin(ST);
    body.classList.add('has-motion');
    mm=gsap.matchMedia();
    mm.add({motion:'(prefers-reduced-motion: no-preference)',desktop:'(min-width: 901px)'},context=>{
      const {motion,desktop}=context.conditions;if(!motion)return;
      // Hero scroll zoom removed at the user's request; accordion remains interactive.
      // 01 CSS clip-path overlay, not an unrelated SVG wipe.
      gsap.fromTo('.mask-reveal',{clipPath:'inset(100% 0 0 0)'},{clipPath:'inset(0% 0 0 0)',ease:'none',scrollTrigger:{trigger:'.text-mask',start:'top top',end:'60% bottom',scrub:.3}});
      gsap.fromTo('.mask-subtext',{opacity:0},{opacity:1,scrollTrigger:{trigger:'.text-mask',start:'55% top',end:'70% top',scrub:true}});
      // 07 Opposing curtains, source power2.inOut and .5 scrub.
      const reel=$('#reel');
      gsap.fromTo('.curtain--left',{xPercent:0},{xPercent:-100,ease:'power2.inOut',scrollTrigger:{trigger:reel,start:'top top',end:'60% top',scrub:.5}});
      gsap.fromTo('.curtain--right',{xPercent:0},{xPercent:100,ease:'power2.inOut',scrollTrigger:{trigger:reel,start:'top top',end:'60% top',scrub:.5}});
      const steps=$$('.step');
      // 02 The Studio's natural-flow features own their state triggers.
      narrativeFeatures.forEach((feature,i)=>ST.create({trigger:feature,start:'top 60%',end:'bottom 40%',onEnter:()=>activateNarrative(i),onEnterBack:()=>activateNarrative(i)}));
      // 05 Older cards scale to .95 / opacity .6 as their successor arrives.
      if(desktop||innerHeight>=600)steps.slice(0,-1).forEach((step,i)=>gsap.to(step,{scale:.95,opacity:.6,scrollTrigger:{trigger:steps[i+1],start:'top 80%',end:'top 20%',scrub:true}}));
      // 06 Real path length plus scroll-synchronized milestone opacity.
      const path=$('#pathDraw');path.removeAttribute('pathLength');const len=path.getTotalLength();
      gsap.fromTo(path,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'#processTrack',start:'top top',end:'bottom bottom',scrub:.3,onUpdate:self=>activateStage(Math.min(4,Math.floor(self.progress*5)))}});
      $$('.process-milestone').forEach((c,i)=>gsap.fromTo(c,{opacity:.2},{opacity:1,duration:.5,scrollTrigger:{trigger:'#processTrack',start:(15+i*20)+'% top',end:(22+i*20)+'% top',scrub:true}}));
      // 08 Opposite tracks with measured item height and source .3 scrub.
      if(desktop){const split=$('.split'),left=$('.split-track--media'),right=$('.split-track--copy');
        gsap.fromTo(left,{y:0},{y:()=>-($('.split-cell',left).offsetHeight*($$('.split-cell',left).length-1)),ease:'none',scrollTrigger:{trigger:split,start:'top top',end:'bottom bottom',scrub:.3,invalidateOnRefresh:true}});
        gsap.fromTo(right,{y:()=>-($('.split-cell',right).offsetHeight*($$('.split-cell',right).length-1))},{y:0,ease:'none',scrollTrigger:{trigger:split,start:'top top',end:'bottom bottom',scrub:.3,invalidateOnRefresh:true}});
      }
      ST.create({onUpdate:self=>{velocity=Math.abs(self.getVelocity());}});
      // 09 Source enter/enterBack palette sequencing and 800ms CSS interpolation.
      const scenes=$$('main > section[data-mood]');
      const activateScene=section=>{
        root.style.setProperty('--page-bg',section.dataset.bg||'#FAF9F6');root.style.setProperty('--page-text',section.dataset.text||'#1C1C1C');
        SK.setSection(section.dataset.nav||(section.id==='hero'?'top':section.id),section.dataset.label||section.id);
      };
      scenes.forEach(section=>ST.create({trigger:section,start:'top 60%',end:'bottom 40%',onEnter:()=>activateScene(section),onEnterBack:()=>activateScene(section)}));
      // A filter/resize can move several section boundaries in one refresh.
      // Resolve the final scene from the same 60% marker after callbacks settle.
      const settleScene=()=>{const scene=[...scenes].reverse().find(s=>s.getBoundingClientRect().top<=innerHeight*.6)||scenes[0];if(scene)activateScene(scene);};
      ST.addEventListener('refresh',settleScene);ST.addEventListener('scrollEnd',settleScene);
      context.add(()=>()=>{ST.removeEventListener('refresh',settleScene);ST.removeEventListener('scrollEnd',settleScene);});
      // 27 Supplemental scroll rotation on outer wrapper; inner ring keeps native 20s spin.
      let angle=0;
      ST.create({onUpdate:self=>{angle+=self.getVelocity()*.02;$('.reel-ring').style.setProperty('--scroll-angle',angle+'deg');}});
      buildStrip();
      return()=>{stripTween?.scrollTrigger?.kill();stripTween?.kill();stripTween=null;root.style.removeProperty('--page-bg');root.style.removeProperty('--page-text');};
    });
  }

  on(window,'resize',()=>{buildStrip();refresh();});
  cleanup.push(SK.onIntro(name=>{if(name==='galleryMode'||name==='galleryFilter'){preview.classList.remove('visible');$$('.project-media').forEach(el=>el.style.transform='');buildStrip();refresh();}}));
  document.fonts?.ready.then(()=>{if(!destroyed){buildStrip();refresh();}});
  on(window,'load',()=>{buildStrip();refresh();});
  on(window,'pageshow',e=>{if(e.persisted){lastTime=0;refresh();wake();}});
  function destroy(){destroyed=true;cancelAnimationFrame(raf);timers.forEach(clearTimeout);cleanup.forEach(fn=>fn());mm?.revert();stripTween?.scrollTrigger?.kill();stripTween?.kill();}
  on(window,'pagehide',e=>{if(e.persisted){cancelAnimationFrame(raf);raf=0;lastTime=0;}else destroy();});
  SK.motion.destroy=destroy;
  wake();
})();
