async(page)=>{
 await page.route('**/*',r=>r.continue());await page.addInitScript(()=>sessionStorage.setItem('sk-opening-seen','1'));await page.emulateMedia({reducedMotion:'reduce'});
 const errors=[],results={widths:[],filters:[],modes:[],projects:[]};page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8081/',{waitUntil:'domcontentloaded'});
 if(await page.locator('.project').count()!==10)throw Error('Expected ten projects');
 for(const width of [1920,1440,1280,1024,768,430,390,360,320]){
  await page.setViewportSize({width,height:900});await page.locator('.work-controls').scrollIntoViewIfNeeded();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Overflow at '+width);results.widths.push({width,overflow});
  if(width===390)await page.screenshot({path:'output/playwright/collection-10-mobile.png'});
 }
 await page.setViewportSize({width:1440,height:900});
 const expected={ads:2,commercial:2,drama:2,film:2,music:1,visual:1,all:10};
 for(const [filter,count]of Object.entries(expected)){
  await page.locator('[data-filter='+filter+']').click();const actual=await page.locator('.project:not(.is-hidden)').count();if(actual!==count||+(await page.locator('#filterCount').textContent())!==count)throw Error('Wrong count for '+filter);results.filters.push({filter,count:actual});
 }
 for(const mode of ['grid','list','cover','pan','strip']){
  await page.locator('[data-view='+mode+']').click();if(await page.locator('[data-view='+mode+']').getAttribute('aria-pressed')!=='true')throw Error('Mode '+mode);if(await page.locator('.project:not(.is-hidden)').count()!==10)throw Error('Missing entries in '+mode);results.modes.push(mode);
 }
 await page.locator('[data-view=grid]').click();
 for(let i=0;i<10;i++){
  const card=page.locator('.project').nth(i),title=await card.locator('strong').textContent();await card.click();await page.locator('#projectDialog[open]').waitFor();if(await page.locator('#projectTitle').textContent()!==title)throw Error('Wrong detail '+i);results.projects.push(title);await page.keyboard.press('Escape');
 }
 await page.locator('.work-head').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/collection-10-desktop.png'});
 results.errors=errors;if(errors.length)throw Error(JSON.stringify(errors));return results;
}
