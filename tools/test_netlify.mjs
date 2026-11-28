import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from './build_netlify.mjs';
const root=mkdtempSync(join(tmpdir(),'sk-netlify-'));
try {
  const files=['index.html','services.html','insights.html','style.css','motion.css','cinema.css','light.css','experience.css','services.css','insights.css','script.js','motion.js','robots.txt','sitemap.xml','LICENSE-CINEMATIC-MODULES.txt','_headers','admin.html','admin.js','admin.css'];
  for(const f of files)writeFileSync(join(root,f),'public file');
  for(const folder of ['assets','content','insights','.admin-state','archive'])mkdirSync(join(root,folder));
  writeFileSync(join(root,'assets/photo.webp'),'image bytes');
  writeFileSync(join(root,'.admin-state/password'),'PRIVATE_PASSWORD');
  writeFileSync(join(root,'admin.html'),'<body>Online editor</body>');
  writeFileSync(join(root,'archive/history.zip'),'PRIVATE_HISTORY');
  writeFileSync(join(root,'insights/live-post.html'),'Published article');
  writeFileSync(join(root,'insights/draft-post.html'),'PRIVATE_DRAFT');
  const data={projects:[{id:1,title:'Public project'}],posts:[{slug:'live-post',published:true},{slug:'draft-post',body:'PRIVATE_DRAFT',published:false}],settings:{siteUrl:'https://skfilmsproductions.com',offices:[{city:'Lahore',address:'UNAPPROVED_ADDRESS',approved:false}]}};
  writeFileSync(join(root,'content/public.json'),JSON.stringify(data));
  const result=buildSite(root);
  assert.equal(result.publishedArticles,1);
  for(const f of ['index.html','services.html','insights.html','404.html','_headers','insights/live-post.html','assets/photo.webp'])assert.ok(existsSync(join(root,'dist',f)),f);
  for(const f of ['.admin-state/password','archive/history.zip','insights/draft-post.html'])assert.ok(!existsSync(join(root,'dist',f)),f);
  const manifest=readFileSync(join(root,'dist/content/public.json'),'utf8');
  assert.ok(!manifest.includes('PRIVATE_DRAFT'));assert.ok(!manifest.includes('UNAPPROVED_ADDRESS'));
  const previousContext=process.env.CONTEXT,previousDeploy=process.env.DEPLOY_ID;
  try {
    process.env.CONTEXT='production';process.env.DEPLOY_ID='production-one';buildSite(root);
    assert.equal(JSON.parse(readFileSync(join(root,'dist/content/hosting.json'))).storeName,'sk-films-live-v1');
    process.env.DEPLOY_ID='production-two';buildSite(root);
    assert.equal(JSON.parse(readFileSync(join(root,'dist/content/hosting.json'))).storeName,'sk-films-live-v1');
    process.env.CONTEXT='deploy-preview';buildSite(root);
    assert.equal(JSON.parse(readFileSync(join(root,'dist/content/hosting.json'))).storeName,'sk-films-preview-production-two');
  } finally {
    if(previousContext===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=previousContext;
    if(previousDeploy===undefined)delete process.env.DEPLOY_ID;else process.env.DEPLOY_ID=previousDeploy;
  }
  symlinkSync(join(root,'.admin-state/password'),join(root,'assets/leak.webp'));
  assert.throws(()=>buildSite(root),/symlinks/);unlinkSync(join(root,'assets/leak.webp'));
  data.posts.push({slug:'../private',published:true});writeFileSync(join(root,'content/public.json'),JSON.stringify(data));
  assert.throws(()=>buildSite(root),/Invalid published article slug/);
  console.log('PASS: static pages/assets, published articles, private/draft exclusion, office privacy, symlink rejection and slug validation. No private state required.');
} finally {rmSync(root,{recursive:true,force:true});}
