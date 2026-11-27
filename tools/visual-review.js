async(page)=>{
 const browser=page.context().browser(),ctx=await browser.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(()=>sessionStorage.setItem('sk-opening-seen','1'));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.bringToFront();await p.goto('http://127.0.0.1:8081/',{waitUntil:'networkidle'});
 const data=[];
 async function at(selector,fraction=0){await p.evaluate(({selector,fraction})=>{let top=0;const el=document.querySelector(selector);for(let n=el;n;n=n.offsetParent)top+=n.offsetTop;scrollTo(0,top+fraction*(el.offsetHeight-innerHeight));},{selector,fraction});await p.waitForTimeout(650);}
 for(const f of [.55,.9,.55,0]){await at('.hero',f);const state=await p.locator('.hero-reveal').evaluate(e=>({opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility}));data.push({fraction:f,...state});if(f===.55)await p.screenshot({path:'output/playwright/hero-reveal.png'});}
 for(const[sel,file]of [['.hero','final-desktop-hero'],['.work','final-work'],['.studio','final-studio'],['.expertise','final-services'],['.process','final-process'],['.people','final-people'],['.contact','final-contact']]){await at(sel);await p.screenshot({path:'output/playwright/'+file+'.png'});}
 await at('#reel',.9);await p.screenshot({path:'output/playwright/final-reel.png'});
 await p.setViewportSize({width:390,height:844});await at('.work');await p.screenshot({path:'output/playwright/final-mobile-work.png'});await at('.contact');await p.screenshot({path:'output/playwright/final-mobile-contact.png'});
 await ctx.close();
 // Finish the particle reference with a peak observer; no particles exist before clicking.
 const rctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'output/playwright/particle-reference-video',size:{width:1440,height:900}}});const r=await rctx.newPage();await r.bringToFront();await r.goto('http://127.0.0.1:8082/particle-button.html',{waitUntil:'networkidle'});
 await r.locator('.explode-btn').first().scrollIntoViewIfNeeded();
 await r.evaluate(()=>{window.particlePeak=0;new MutationObserver(()=>{window.particlePeak=Math.max(window.particlePeak,document.querySelectorAll('.particle').length);}).observe(document.body,{childList:true});});
 await r.locator('.explode-btn').first().click();await r.waitForTimeout(100);await r.screenshot({path:'output/playwright/reference-particle-button.png'});await r.waitForTimeout(800);const particle=await r.evaluate(()=>({peak:window.particlePeak,remaining:document.querySelectorAll('.particle').length}));await rctx.close();
 return{heroReveal:data,errors,particle};
}
