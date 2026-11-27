async (page) => {
 const ctx=await page.context().browser().newContext({viewport:{width:1440,height:900},recordVideo:{dir:'output/playwright/reference-video',size:{width:1440,height:900}}});
 const p=await ctx.newPage();p.setDefaultTimeout(5000);
 const gsapText=await (await p.request.get('http://127.0.0.1:8081/assets/vendor/gsap.min.js')).text();
 const stText=await (await p.request.get('http://127.0.0.1:8081/assets/vendor/ScrollTrigger.min.js')).text();
 await p.route('**/gsap.min.js',r=>r.fulfill({body:gsapText,contentType:'application/javascript'}));
 await p.route('**/ScrollTrigger.min.js',r=>r.fulfill({body:stText,contentType:'application/javascript'}));
 const configs=[
 ['text-mask','.mask-section','.mask-reveal','scroll'],['sticky-stack','.stack-section','.mockup-state','scroll'],['zoom-parallax','.zoom-section','.layer-fg','scroll'],['horizontal-scroll','.h-scroll-section','#hTrack','scroll'],['sticky-cards','.cards-section','.stack-card','scroll'],['svg-draw','.draw-section','#mainPath','scroll'],['curtain-reveal','.curtain-section','#cLeft','scroll'],['split-scroll','.split-section','#leftCol','scroll'],['color-shift','.section:nth-child(2)','body','scroll'],
 ['cursor-reactive','.cards-section','.tilt-card','hover'],['accordion-slider','.accordion-section','.accordion-panel:nth-child(2)','hover'],['cursor-reveal','.reveal-section','#hBefore','drag'],['image-trail','#trailArea','.trail-img','trail'],['flip-cards','.cards-section','.flip-inner','hover'],['magnetic-grid','.grid-section','.repel-dot','hover'],['spotlight-border','.grid-section','.spot-card','hover'],['drag-pan','.pan-section','#panCanvas','pan'],['view-transitions','.products-section','.product-overlay','click'],['particle-button','.buttons-section','.particle','click'],['odometer','.stats-section','.odo-strip','scroll'],['coverflow','.carousel-section','.carousel-item','click'],['dynamic-island','.hero','#island','click'],['dock-nav','.hero','.dock-item','dock'],['text-scramble','.scramble-section','.scramble-headline','scroll'],['kinetic-marquee','.marquee-section','.marquee-row','ambient'],['mesh-gradient','.mesh-section','#meshMain','ambient'],['circular-text','.circle-section','.circle-svg','ambient'],['glitch-effect','.glitch-section','.glitch','hover'],['typewriter','.type-section','#cycler','ambient'],['gradient-stroke','.stroke-section','.stroke-text','ambient']
 ];
 const rows=[];
 for(const [name,section,sel,kind]of configs){
   const errors=[];const error=e=>errors.push(e.message);p.on('pageerror',error);
   try{
    await p.goto('http://127.0.0.1:8082/'+name+'.html',{waitUntil:'domcontentloaded',timeout:20000});
    await p.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
    await p.locator(section).first().scrollIntoViewIfNeeded();await p.waitForTimeout(220);
    const sample=()=>p.locator(sel).first().evaluate(e=>({transform:getComputedStyle(e).transform,opacity:getComputedStyle(e).opacity,clip:getComputedStyle(e).clipPath,stroke:getComputedStyle(e).strokeDashoffset,width:e.getBoundingClientRect().width,bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,text:e.textContent?.slice(0,60),count:document.querySelectorAll(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:'canvas').length,pseudo:getComputedStyle(e,'::before').transform}));
    let before=await sample();
    if(kind==='scroll'){await p.evaluate(selector=>{const el=document.querySelector(selector);scrollTo(0,el.getBoundingClientRect().top+scrollY+Math.max(400,(el.offsetHeight-innerHeight)*.6));},section);}
    if(kind==='hover'){const box=await p.locator(sel).first().boundingBox();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.35);}
    if(kind==='drag'){const box=await p.locator('#hCompare').boundingBox();await p.mouse.move(box.x+box.width*.2,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.8,box.y+box.height*.5,{steps:10});await p.mouse.up();}
    if(kind==='trail'){const box=await p.locator(section).boundingBox();await p.mouse.move(box.x+200,box.y+200);await p.mouse.move(box.x+450,box.y+300,{steps:8});}
    if(kind==='pan'){const box=await p.locator(section).boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+140,box.y+box.height/2+80,{steps:10});await p.mouse.up();}
    if(kind==='click'){const target=name==='view-transitions'?'.product-card':name==='particle-button'?'.explode-btn':name==='coverflow'?'.carousel-item':name==='dynamic-island'?'#island':sel;await p.locator(target).first().click({force:true});}
    if(kind==='dock'){await p.locator('.dock-item').nth(3).hover();}
    if(name==='text-scramble')await p.waitForTimeout(100);
    await p.waitForTimeout(kind==='ambient'?350:180);
    const during=await sample();await p.screenshot({path:'output/playwright/reference-'+name+'.png'});await p.waitForTimeout(500);const after=await sample();
    rows.push({name,inspected:true,kind,before,during,after,errors});
   }catch(e){rows.push({name,inspected:false,error:e.message,errors});}
   p.off('pageerror',error);
 }
 await ctx.close();return rows;
}
