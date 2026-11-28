async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const p=await context.newPage(),errors=[],results={sizes:[]};p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.continue());await p.addInitScript(()=>sessionStorage.setItem('sk-opening-seen','1'));
 await p.goto('http://127.0.0.1:8081/',{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);
 const sizes=[[390,844],[320,640],[360,740],[430,932],[768,1024],[844,390],[1024,768],[1280,900],[1440,900],[1920,1080]];
 for(const [width,height]of sizes){
  await p.setViewportSize({width,height});await p.waitForTimeout(350);await p.evaluate(()=>ScrollTrigger.refresh());await p.waitForTimeout(200);
  const samples=[];
  for(const progress of [0,1/3,2/3,1]){
   await p.evaluate(progress=>{document.documentElement.style.scrollBehavior='auto';const t=ScrollTrigger.getAll().find(t=>t.trigger?.id==='perspective');if(!t)throw Error('Missing mobile split trigger');scrollTo({top:t.start+(t.end-t.start)*progress,behavior:'instant'});},progress);await p.waitForTimeout(450);
   const sample=await p.evaluate(()=>{
    const split=document.querySelector('#perspective'),left=split.querySelector('.split-track--media'),right=split.querySelector('.split-track--copy'),stage=split.querySelector('.split-sticky'),panes=[...split.querySelectorAll('.split-col')];const t=ScrollTrigger.getAll().find(t=>t.trigger===split);
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
    const copy=[...right.children].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-panes[1].getBoundingClientRect().top)-Math.abs(b.getBoundingClientRect().top-panes[1].getBoundingClientRect().top))[0];
    return {start:t.start,end:t.end,scroll:scrollY,viewport:innerHeight,progress:t.progress,leftY:+gsap.getProperty(left,'y'),rightY:+gsap.getProperty(right,'y'),leftCell:left.firstElementChild.offsetHeight,rightCell:right.firstElementChild.offsetHeight,stage:rect(stage),panes:panes.map(rect),text:copy.querySelector('h3').textContent,copyClipped:copy.scrollHeight>copy.clientHeight+1,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   if(Math.abs(sample.leftY+sample.leftCell*3*progress)>5||Math.abs(sample.rightY+sample.rightCell*3*(1-progress))>5||sample.copyClipped||sample.overflow)throw Error(JSON.stringify({width,height,expectedProgress:progress,...sample}));
   if(width<=760&&Math.abs(sample.panes[0].width-width)>1)throw Error('Mobile pane not full width');
   samples.push(sample);
   if(width===390)await p.screenshot({path:'output/playwright/mobile-split-'+Math.round(progress*3)+'.png'});
  }
  results.sizes.push({width,height,samples});
 }
 await p.setViewportSize({width:390,height:844});await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(250);
 results.reduced=await p.evaluate(()=>({animated:document.querySelector('#perspective').classList.contains('is-scroll-split'),tracks:[...document.querySelectorAll('#perspective .split-col')].map(e=>Math.round(e.getBoundingClientRect().width)),headings:document.querySelectorAll('#perspective h3').length,overflow:document.documentElement.scrollWidth>innerWidth}));
 if(results.reduced.animated||results.reduced.overflow||results.reduced.tracks.some(w=>w<150))throw Error('Unreadable reduced motion fallback');
 await p.screenshot({path:'output/playwright/mobile-split-reduced.png'});
 await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(250);
 results.restored=await p.locator('#perspective').evaluate(el=>el.classList.contains('is-scroll-split'));if(!results.restored)throw Error('Motion preference restoration failed');
 await p.route('**/assets/vendor/*',r=>r.abort());await p.reload({waitUntil:'domcontentloaded'});
 results.noGSAP=await p.evaluate(()=>({motion:document.body.classList.contains('has-motion'),widths:[...document.querySelectorAll('#perspective .split-col')].map(e=>Math.round(e.getBoundingClientRect().width)),overflow:document.documentElement.scrollWidth>innerWidth}));
 if(results.noGSAP.motion||results.noGSAP.overflow||results.noGSAP.widths.some(w=>w<150))throw Error('Unreadable dependency fallback');
 results.errors=errors;await context.close();if(errors.length)throw Error(JSON.stringify(errors));return results;
}
