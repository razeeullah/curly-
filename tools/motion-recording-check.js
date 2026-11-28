async(page)=>{
 await page.route('**/*',route=>route.continue());
 const errors=[],results={widths:[],reference:{}};page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('sk-opening-seen','1'));
 for(const width of [1920,1440,1280,1024,768,430,390,360,320]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8081/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  const samples=await page.evaluate(async()=>{
   document.documentElement.style.scrollBehavior='auto';const head=document.querySelector('.work-head'),target=document.querySelector('[data-scramble]');
   scrollTo({top:head.getBoundingClientRect().top+scrollY-150,behavior:'instant'});
   const started=performance.now(),samples=[];await new Promise(resolve=>{function tick(){const r=target.getBoundingClientRect();samples.push({t:Math.round(performance.now()-started),width:r.width,height:r.height,glyphs:target.querySelectorAll('.scrambling').length});if(performance.now()-started<1800)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});return samples;
  });
  await page.waitForFunction(()=>document.querySelector('[data-scramble]').textContent==='in every frame.');
  const widths=samples.map(s=>s.width),heights=samples.map(s=>s.height);
  const metrics={width,widthDrift:Math.max(...widths)-Math.min(...widths),heightDrift:Math.max(...heights)-Math.min(...heights),animated:samples.some(s=>s.glyphs>0),final:await page.locator('[data-scramble]').textContent(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
  if(metrics.widthDrift>1||metrics.heightDrift>1||!metrics.animated||metrics.final!=='in every frame.'||metrics.overflow)throw Error('Unstable headline '+JSON.stringify(metrics));results.widths.push(metrics);
  if(width===1440){
   const r=await page.locator('.work-head').boundingBox();await page.mouse.move(r.x+20,r.y+30);await page.mouse.move(r.x+120,r.y+45);
   results.trail=await page.evaluate(()=>{const el=[...document.querySelectorAll('.trail-still')].find(i=>i.style.left),layer=el.parentElement;return {pool:document.querySelectorAll('.trail-still').length,parent:layer.className,position:getComputedStyle(el).position,overflow:getComputedStyle(layer).overflow,transition:getComputedStyle(el).transition,opacity:+getComputedStyle(el).opacity,headingZ:getComputedStyle(document.querySelector('#workTitle')).zIndex,layerZ:getComputedStyle(layer).zIndex}});
   if(results.trail.pool!==20||results.trail.parent!=='trail-layer'||results.trail.position!=='absolute'||+results.trail.headingZ<=+results.trail.layerZ)throw Error('Trail containment failed');
   await page.screenshot({path:'output/playwright/recording-review/fixed-desktop.png'});
   await page.waitForTimeout(1200);if(await page.locator('.trail-still').evaluateAll(els=>els.some(e=>+getComputedStyle(e).opacity>.001)))throw Error('Trail failed to fade');
   await page.mouse.move(r.x+220,r.y+45);await page.locator('.motion-toggle').evaluate(el=>el.click());
   if(await page.locator('.trail-still').evaluateAll(els=>els.some(e=>+getComputedStyle(e).opacity>.001)))throw Error('Pause failed to clear trail');
   await page.mouse.move(r.x+330,r.y+45);if(await page.locator('.trail-still').evaluateAll(els=>els.some(e=>+getComputedStyle(e).opacity>.001)))throw Error('Trail spawned while paused');results.pause=true;
  }
  if(width===390)await page.screenshot({path:'output/playwright/recording-review/fixed-mobile.png'});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.work-head').scrollIntoViewIfNeeded();await page.mouse.move(50,300);await page.mouse.move(250,350);results.reduced={text:await page.locator('[data-scramble]').textContent(),trails:await page.locator('.trail-still').count()};if(results.reduced.text!=='in every frame.'||results.reduced.trails!==0)throw Error('Reduced motion failed');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:900});
 const source=await page.context().newPage();
 await source.route('**/gsap.min.js',r=>r.fulfill({path:'assets/vendor/gsap.min.js',contentType:'text/javascript'}));
 await source.route('**/ScrollTrigger.min.js',r=>r.fulfill({path:'assets/vendor/ScrollTrigger.min.js',contentType:'text/javascript'}));
 await source.goto('http://127.0.0.1:8086/image-trail.html',{waitUntil:'domcontentloaded'});await source.locator('#trailArea').scrollIntoViewIfNeeded();const r=await source.locator('#trailArea').boundingBox();await source.mouse.move(100,r.y+180);await source.mouse.move(230,r.y+220);
 results.reference.trail=await source.locator('.trail-img').evaluateAll(els=>({pool:els.length,transition:getComputedStyle(els.find(e=>e.style.left)).transition,opacity:+getComputedStyle(els.find(e=>e.style.left)).opacity}));await source.screenshot({path:'output/playwright/recording-review/reference-trail.png'});
 await source.goto('http://127.0.0.1:8086/text-scramble.html',{waitUntil:'domcontentloaded'});await source.locator('[data-trigger=scroll]').first().scrollIntoViewIfNeeded();await source.waitForTimeout(450);results.reference.scrambleIntermediate=await source.locator('.scrambling').count();await source.screenshot({path:'output/playwright/recording-review/reference-scramble.png'});await source.waitForTimeout(1300);results.reference.scrambleFinal=await source.locator('[data-trigger=scroll]').first().textContent();await source.close();
 results.errors=errors;if(errors.length)throw Error(JSON.stringify(errors));return results;
}
