#!/usr/bin/env node
// Dependency-free static packaging. Never reads private editor state or runs Python.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, rmSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildSite(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  root = resolve(root);
  const dist = join(root, 'dist');
  const data = JSON.parse(readFileSync(join(root, 'content/public.json'), 'utf8'));
  if (!Array.isArray(data.projects) || !data.projects.length || !Array.isArray(data.posts)) throw Error('Missing published website content. Save/export locally before pushing.');
  const posts = data.posts.filter(post => post.published === true);
  const names = new Set();
  for (const post of posts) {
    if (typeof post.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || post.slug.length > 80 || names.has(post.slug)) throw Error('Invalid published article slug');
    names.add(post.slug);
  }
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  let count = 0;
  const copy = name => {
    const source = join(root, name);
    if (lstatSync(source).isSymbolicLink()) throw Error('Symbolic links are not allowed in the public package: ' + name);
    const destination = join(dist, name);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination); count++;
  };
  for (const name of ['index.html', 'services.html', 'insights.html', 'style.css', 'motion.css', 'cinema.css', 'light.css', 'experience.css', 'services.css', 'insights.css', 'script.js', 'motion.js', 'robots.txt', 'sitemap.xml', 'LICENSE-CINEMATIC-MODULES.txt', '_headers', 'admin.html', 'admin.js', 'admin.css']) copy(name);
  const assets = directory => {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const name = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw Error('Asset symlinks are not allowed: ' + name);
      if (entry.isDirectory()) assets(name);
      else if (entry.isFile()) copy(name);
    }
  };
  assets('assets');
  const imageNames=[];
  const catalog=directory=>{for(const entry of readdirSync(join(root,directory),{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const name=join(directory,entry.name);if(entry.isDirectory())catalog(name);else if(/\.(png|webp|jpe?g)$/i.test(name))imageNames.push(name.replaceAll('\\','/'))}};
  catalog('assets');
  const admin=readFileSync(join(dist,'admin.html'),'utf8').replace('<body>','<body data-runtime="netlify">').replace(/(<p id="editorMode">)[\s\S]*?(<\/p>)/,'$1Online editor · Saved to Netlify content storage.$2').replace(/(<p id="loginInstructions">)[\s\S]*?(<\/p>)/,'$1Sign in with the administrator password configured in Netlify. Set SK_ADMIN_PASSWORD with Functions scope and redeploy to activate editing.$2').replace('Local editor password</label>','Administrator password</label>');writeFileSync(join(dist,'admin.html'),admin);

  for (const post of posts) copy(join('insights', post.slug + '.html'));
  // Defensively strip draft articles and unapproved office details from the public manifest.
  // Older local publishers may omit settings; recover only already-public HTML,
  // never private editor state. This also keeps existing Git checkouts deployable.
  const home=readFileSync(join(root,'index.html'),'utf8');
  const decode=value=>String(value||'').replace(/&(?:amp|quot|lt|gt|apos|#39|#x[0-9a-f]+|#\d+);/gi,token=>{const known={'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&apos;':"'",'&#39;':"'"};return known[token]??String.fromCodePoint(parseInt(token.slice(token[2].toLowerCase()==='x'?3:2,-1),token[2].toLowerCase()==='x'?16:10))});
  const publishedOffices=[...home.matchAll(/<article class="office-card">([\s\S]*?)<\/article>/g)].map(m=>{const value=pattern=>decode(m[1].match(pattern)?.[1]);const address=value(/<address>([\s\S]*?)<\/address>/),mapUrl=value(/<a[^>]*href="(https:[^"]+)"/),embedUrl=value(/<iframe[^>]*src="([^"]+)"/);return {city:value(/<h3>(.*?)<\/h3>/),address,mapUrl,embedUrl,approved:!!(address||mapUrl||embedUrl)}});
  const canonical=decode(home.match(/rel="canonical" href="([^"]+)"/)?.[1]);
  const settings = {siteUrl:canonical?new URL(canonical).origin:'',homeTitle:decode(home.match(/<title>(.*?)<\/title>/)?.[1])||'SK Films Productions',homeDescription:decode(home.match(/<meta name="description" content="([^"]*)"/)?.[1])||'Film, commercial and visual production.',offices:publishedOffices,...data.settings};
  const publicSettings = Object.fromEntries(['siteUrl', 'homeTitle', 'homeDescription'].filter(k => typeof settings[k] === 'string').map(k => [k, settings[k]]));
  publicSettings.offices = (settings.offices || []).map(o => ({ city: o.city, approved: o.approved === true, address: o.approved === true ? o.address || '' : '', mapUrl: o.approved === true ? o.mapUrl || '' : '', embedUrl: o.approved === true ? o.embedUrl || '' : '' }));
  mkdirSync(join(dist, 'content'), { recursive: true });
  writeFileSync(join(dist, 'content/public.json'), JSON.stringify({ projects: data.projects, posts, settings: publicSettings }, null, 2) + '\n'); count++;
  writeFileSync(join(dist, '404.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found — SK Films Productions</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/light.css"><link rel="stylesheet" href="/services.css"></head><body><main class="services-intro"><p>SK Films Productions / 404</p><h1>A different<br>scene.</h1><p>This page could not be found.</p><a class="service-cta" href="/">Return to the website <span aria-hidden="true">↗</span></a></main></body></html>\n'); count++;
  const deployContext=process.env.CONTEXT||'dev';
  const scope=process.env.DEPLOY_ID||createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0,16);
  const storeName=deployContext==='production'?'sk-films-live-v1':'sk-films-preview-'+scope.replace(/[^a-zA-Z0-9-]/g,'').slice(0,40);
  writeFileSync(join(dist,'content/image-catalog.json'),JSON.stringify(imageNames.sort())+'\n');
  writeFileSync(join(dist,'content/hosting.json'),JSON.stringify({context:deployContext,storeName})+'\n');count+=2;
  return { directory: relative(root, dist), files: count, publishedArticles: posts.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildSite();
  console.log(`Netlify-ready: ${result.directory}/ (${result.files} public files, ${result.publishedArticles} published articles). Online admin included; no Python runtime, credentials or private drafts included.`);
}
