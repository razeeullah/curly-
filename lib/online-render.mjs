import {escape as e,safeJSON,publicContent} from './online-content.mjs';
export function renderHome(template,data){
 const cards=data.projects.map((p,i)=>`<button type="button" class="project" data-category="${p.category}" data-project="${p.id}" style="--crop:${p.crop}"><span class="project-media"><img src="${e(p.src)}" alt="${e(p.alt)}" loading="lazy" decoding="async"><span class="project-tag label">${p.illustrative?'Concept':'Project'} ${String(i+1).padStart(2,'0')}</span><span class="project-open" aria-hidden="true"><svg><use href="#i-arrow-ne"/></svg></span></span><span class="project-info"><span class="project-title"><strong>${e(p.title)}</strong><em>${e(p.type)}</em></span><span class="label project-idx">${String(i+1).padStart(2,'0')}</span></span></button>`).join('\n');
 let count=0;
 let html=template.replace(/(<div class="projects"[^>]*>)[\s\S]*?(<\/div>\s*(?:<p class="gallery-empty"[\s\S]*?<\/p>\s*)?<div class="gallery-progress")/,(_,a,b)=>{count++;return a+cards+b});
 if(count!==1)throw Error('Portfolio template anchor missing');
 html=html.replace(/(<(?:span|sup) id="filterCount">).*?(<\/(?:span|sup)>)/,(_,a,b)=>a+String(data.projects.length).padStart(2,'0')+b);
 html=html.replace(/(<span class="odometer" id="odometer"[^>]*aria-label=")[^"]*(">)[\s\S]*?(<\/span>)/,(_,a,b,c)=>a+data.projects.length+' portfolio projects'+b+String(data.projects.length).padStart(2,'0')+c);
 const entries=Object.fromEntries(data.projects.map(p=>[p.id,p]));
 html=html.replace('</head>',()=>'<script id="portfolioData" type="application/json">'+safeJSON(entries)+'</script></head>');
 const offices=data.settings.offices.map(o=>`<article class="office-card"><h3>${e(o.city)}</h3>${o.approved&&o.address?'<address>'+e(o.address)+'</address>':''}${o.approved&&o.mapUrl?'<a class="service-cta" href="'+e(o.mapUrl)+'" target="_blank" rel="noopener noreferrer">Open Google Maps <span aria-hidden="true">↗</span></a>':''}${o.approved&&o.embedUrl?'<iframe src="'+e(o.embedUrl)+'" title="'+e(o.city)+' office on Google Maps" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>':''}</article>`).join('');
 const location=offices?`<section class="studio-location" id="locations" data-mood="locations" data-bg="#F2F0EB" data-text="#1C1C1C" data-nav="contact" data-label="Our offices" aria-labelledby="locationTitle"><div><p class="label">SK Films Productions</p><h2 id="locationTitle">Our offices.</h2></div><div class="office-grid">${offices}</div></section>`:'';
 html=html.replace(/<!-- LOCATION START -->[\s\S]*?<!-- LOCATION END -->/,()=>'<!-- LOCATION START -->'+location+'<!-- LOCATION END -->');
 return html;
}
export function renderInsights(template,data){
 const posts=data.posts.filter(p=>p.published).sort((a,b)=>b.date.localeCompare(a.date));
 const articles=posts.map(p=>`<article class="insight-row"><time datetime="${p.date}">${p.date}</time><div><h2><a href="insights/${p.slug}.html">${e(p.title)}</a></h2><p>${e(p.excerpt)}</p></div><a class="service-cta" href="insights/${p.slug}.html">Read article <span aria-hidden="true">↗</span></a></article>`).join('');
 const list=articles||'<div class="insights-empty"><h2>Stories are taking shape.</h2><p>Studio news, film notes and production insights will appear here when published.</p><a class="service-cta" href="index.html#work">Explore the collection <span aria-hidden="true">↗</span></a></div>';
 return template.replace(/(<section class="insights-list"[^>]*>)[\s\S]*?(<\/section>)/,(_,a,b)=>a+list+b);
}
export function renderArticle(template,post){
 const paragraphs=post.body.split(/\n\s*\n/).filter(p=>p.trim()).map(p=>'<p>'+e(p).replace(/\n/g,'<br>')+'</p>').join('');
 let html=template.replace(/<main id="main">[\s\S]*?<\/main>/,()=>`<main id="main"><article class="article-page"><a class="article-back" href="../insights.html">← All insights</a><time datetime="${post.date}">${post.date}</time><h1>${e(post.title)}</h1><p class="article-intro">${e(post.excerpt)}</p><div class="article-body">${paragraphs}</div></article></main>`);
 // Shared template assets/links must remain valid one directory below the root.
 html=html.replace(/(href|src)="(?!https?:|\/|#|\.\.\/)([^"]+)"/g,'$1="../$2"');
 return html;
}
export function metadata(html,{title,description,path,settings,post}){
 const oldJSON=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
 html=html.replace(/<!-- SEO START -->[\s\S]*?<!-- SEO END -->/g,'').replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+e(title)+'</title>').replace(/<meta name="description" content="[^"]*">/,()=>'<meta name="description" content="'+e(description)+'">');
 const site=settings.siteUrl||'',url=site+path;
 const organization={'@context':'https://schema.org','@type':'Organization',name:'SK Films Productions',...(site?{url:site,logo:site+'/assets/logo.png'}:{})};
 if(path==='/services.html'&&oldJSON){try{const previous=JSON.parse(oldJSON);if(previous.hasOfferCatalog)organization.hasOfferCatalog=previous.hasOfferCatalog}catch{}}
 const schema=post?{'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:post.excerpt,datePublished:post.date,publisher:{'@type':'Organization',name:'SK Films Productions'}}:organization;
 const tags=`<!-- SEO START --><meta property="og:type" content="${post?'article':'website'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta name="twitter:card" content="summary_large_image">${site?'<link rel="canonical" href="'+e(url)+'"><meta property="og:url" content="'+e(url)+'"><meta property="og:image" content="'+e(site)+'/assets/hero-v2.webp">':''}<script type="application/ld+json">${safeJSON(schema)}</script><!-- SEO END -->`;
 return html.replace('</head>',()=>tags+'</head>');
}
export function createSite({app,templates}){
 const html=(body,status=200,head=false)=>new Response(head?null:body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
 return async req=>{
  try{
   const url=new URL(req.url),path=decodeURIComponent(url.pathname),head=req.method==='HEAD';
   if(path==='/index.html')return new Response(null,{status:301,headers:{Location:'/'+url.search}});
   const data=await app.current(),settings=data.settings,posts=data.posts.filter(p=>p.published);
   if(path==='/robots.txt')return new Response(head?null:'User-agent: *\nDisallow: /admin.html\nDisallow: /admin\nDisallow: /api/\nSitemap: '+settings.siteUrl+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
   if(path==='/sitemap.xml')return new Response(head?null:'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/services.html','/insights.html',...posts.map(p=>'/insights/'+p.slug+'.html')].map(p=>'<url><loc>'+e(settings.siteUrl+p)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
   if(path==='/content/public.json')return new Response(head?null:JSON.stringify(publicContent(data)),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
   if(path==='/')return html(metadata(renderHome(templates.home,data),{title:settings.homeTitle,description:settings.homeDescription,path:'/',settings}),200,head);
   if(['/insights','/insights/','/insights.html'].includes(path))return html(metadata(renderInsights(templates.insights,data),{title:'Insights — SK Films Productions',description:'Studio news, production updates and filmmaking insights from SK Films Productions.',path:'/insights.html',settings}),200,head);
   if(['/services','/services/','/services.html'].includes(path))return html(metadata(templates.services,{title:'Services — SK Films Productions',description:'Film and drama production, commercials, CGI/VFX, animation, architectural visualization, music videos and digital branding.',path:'/services.html',settings}),200,head);
   if(path.startsWith('/insights/')){const slug=path.slice(10).replace(/\.html$/,'');if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return html(templates.notFound,404,head);const post=posts.find(p=>p.slug===slug);if(!post)return html(templates.notFound,404,head);return html(metadata(renderArticle(templates.insights,post),{title:post.title+' — SK Films Insights',description:post.excerpt,path:'/insights/'+slug+'.html',settings,post}),200,head);}
   return html(templates.notFound,404,head);
  }catch(error){console.error('SK Films public rendering failed:',error.name);return html('<!doctype html><title>Temporarily unavailable</title><h1>Please try again shortly.</h1>',503,req.method==='HEAD');}
 };
}
