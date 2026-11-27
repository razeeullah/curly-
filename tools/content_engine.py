"""Validated, file-backed publishing for the local SK Films editor. No third-party modules."""
from pathlib import Path
from urllib.parse import urlparse
from html import escape,unescape
from datetime import date
import json,re,os,tempfile

class Invalid(ValueError):pass

def text(v,limit,required=False):
    if not isinstance(v,str) or len(v)>limit or (required and not v.strip()):raise Invalid('Invalid or missing text field')
    return v.strip()

def validate(raw,root):
    if not isinstance(raw,dict):raise Invalid('Content must be an object')
    projects=raw.get('projects');posts=raw.get('posts');settings=raw.get('settings')
    if not isinstance(projects,list) or not 1<=len(projects)<=50:raise Invalid('Keep between 1 and 50 portfolio projects')
    if not isinstance(posts,list) or len(posts)>100:raise Invalid('Maximum 100 articles')
    if not isinstance(settings,dict):raise Invalid('Missing settings')
    out=[];ids=set()
    for p in projects:
        if not isinstance(p,dict):raise Invalid('Invalid project')
        i=p.get('id')
        if type(i)!=int or i<0 or i>99999 or i in ids:raise Invalid('Project IDs must be unique positive integers or zero')
        ids.add(i);src=text(p.get('src'),250,True)
        path=(root/src).resolve()
        if not src.startswith('assets/') or not path.is_relative_to((root/'assets').resolve()) or path.suffix.lower() not in ['.webp','.jpg','.jpeg','.png'] or not path.is_file():raise Invalid('Choose an existing image in assets/')
        if p.get('category') not in ['film','commercial','visual']:raise Invalid('Choose a valid category')
        crop=text(p.get('crop','50% 50%'),40)
        if not re.fullmatch(r'(?:100|\d{1,2})(?:\.\d+)?% (?:100|\d{1,2})(?:\.\d+)?%',crop):raise Invalid('Crop must be two percentages, for example 50% 50%')
        if type(p.get('illustrative'))!=bool:raise Invalid('Set whether the image is illustrative')
        out.append(dict(id=i,title=text(p.get('title'),100,True),type=text(p.get('type'),100,True),category=p['category'],src=src,alt=text(p.get('alt'),300,True),crop=crop,copy=text(p.get('copy'),3000,True),illustrative=p['illustrative']))
    articles=[];slugs=set()
    for p in posts:
        if not isinstance(p,dict):raise Invalid('Invalid article')
        slug=text(p.get('slug'),80,True)
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug) or slug in slugs:raise Invalid('Article slugs must be unique lowercase words separated by hyphens')
        slugs.add(slug)
        try:date.fromisoformat(p.get('date',''))
        except (ValueError,TypeError):raise Invalid('Article date must use YYYY-MM-DD')
        if type(p.get('published'))!=bool:raise Invalid('Choose draft or published')
        articles.append(dict(slug=slug,title=text(p.get('title'),140,True),excerpt=text(p.get('excerpt'),320,True),body=text(p.get('body'),30000,True),date=p['date'],published=p['published']))
    url=text(settings.get('siteUrl',''),250).rstrip('/')
    u=urlparse(url)
    if url and (not re.fullmatch(r'https://[A-Za-z0-9.-]+(?::[0-9]+)?',url) or u.scheme!='https' or not u.netloc or u.username or u.password or u.query or u.fragment or u.path):raise Invalid('Website URL must be an HTTPS domain with no path')
    address=text(settings.get('mapAddress',''),400);embed=text(settings.get('mapEmbedUrl',''),3000);approved=settings.get('mapApproved',False)
    v=urlparse(embed)
    if embed and (v.scheme!='https' or v.netloc!='www.google.com' or not v.path.startswith('/maps/embed') or v.username):raise Invalid('Use an HTTPS www.google.com/maps/embed URL from Google Maps sharing')
    if type(approved)!=bool or (approved and (not address or not embed)):raise Invalid('Approved map requires an address and Google Maps embed URL')
    offices=[]
    locations=settings.get('offices',[])
    if not isinstance(locations,list) or len(locations)>8:raise Invalid('Keep at most eight offices')
    for o in locations:
        if not isinstance(o,dict):raise Invalid('Invalid office')
        city=text(o.get('city'),120,True);address=text(o.get('address',''),400);link=text(o.get('mapUrl',''),3000);embed_url=text(o.get('embedUrl',''),3000)
        for value,is_embed in [(link,False),(embed_url,True)]:
            if not value:continue
            u=urlparse(value)
            allowed=['www.google.com','google.com','maps.google.com','maps.app.goo.gl','share.google']
            if u.scheme!='https' or u.netloc not in allowed or u.username:raise Invalid('Use an approved HTTPS Google Maps link')
            if is_embed and (u.netloc!='www.google.com' or not u.path.startswith('/maps/embed')):raise Invalid('Use the embed URL provided by Google Maps')
        if type(o.get('approved',False))!=bool:raise Invalid('Choose whether this office map is approved')
        offices.append(dict(city=city,address=address,mapUrl=link,embedUrl=embed_url,approved=o.get('approved',False)))
    return dict(revision=raw.get('revision',0),projects=out,posts=articles,settings=dict(siteUrl=url,homeTitle=text(settings.get('homeTitle'),160,True),homeDescription=text(settings.get('homeDescription'),320,True),mapAddress=address,mapEmbedUrl=embed,mapApproved=approved,offices=offices))

def atomic(path,body):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(dir=path.parent,prefix='.publish-')
    try:
        os.fchmod(fd,0o600 if '.admin-state' in path.parts else 0o644)
        with os.fdopen(fd,'w') as f:f.write(body)
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)

def shell(title,description,body,root_prefix=''):
    p=root_prefix;e=escape
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{e(description,quote=True)}"><meta name="theme-color" content="#FAF9F6"><title>{e(title)}</title><link rel="icon" href="{p}assets/logo.png"><link rel="stylesheet" href="{p}style.css"><link rel="stylesheet" href="{p}light.css"><link rel="stylesheet" href="{p}services.css"><link rel="stylesheet" href="{p}insights.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="services-header"><a class="services-logo" href="{p}index.html"><img src="{p}assets/logo.png" width="400" height="367" alt="SK Films Productions — home"></a><nav aria-label="Main"><a href="{p}index.html#work">Work</a><a href="{p}services.html">Services</a><a href="{p}insights.html">Insights</a><a href="{p}index.html#contact">Contact</a></nav></header><main id="main">{body}</main><footer class="services-footer"><a href="{p}index.html">SK Films Productions</a><span>Bringing stories to life.</span><a href="{p}index.html#contact">Start a project</a></footer></body></html>'''

def build(state,root):
    e=escape;outputs={};settings=state['settings'];site=settings['siteUrl'];projects=state['projects']
    index=(root/'index.html').read_text();cards=''
    for n,p in enumerate(projects,1):
        label=('Concept' if p['illustrative'] else 'Project')+f' {n:02}'
        cards+=f'''<button type="button" class="project" data-category="{p['category']}" data-project="{p['id']}" style="--crop:{p['crop']}"><span class="project-media"><img src="{e(p['src'])}" alt="{e(p['alt'],quote=True)}" loading="lazy" decoding="async"><span class="project-tag label">{label}</span><span class="project-open" aria-hidden="true"><svg><use href="#i-arrow-ne"/></svg></span></span><span class="project-info"><span class="project-title"><strong>{e(p['title'])}</strong><em>{e(p['type'])}</em></span><span class="label project-idx">{n:02}</span></span></button>\n'''
    index,count=re.subn(r'(<div class="projects"[^>]*>)[\s\S]*?(</div>\s*(?:<p class="gallery-empty"[\s\S]*?</p>\s*)?<div class="gallery-progress")',lambda m:m[1]+'\n'+cards+m[2],index,count=1)
    if count!=1:raise Invalid('Portfolio publishing anchor missing; restore the gallery markup before saving')
    index=re.sub(r'(<span id="filterCount">).*?(</span>)',lambda m:m[1]+f'{len(projects):02}'+m[2],index)
    index=index.replace('Four frames. Different ways of seeing.','Different frames. Different ways of seeing.')
    note='Collection includes illustrative studies; these are marked as concepts.' if any(p['illustrative'] for p in projects) else 'Explore our film and visual production work.'
    index=re.sub(r'(<p class="note">)(?:Concept collection\.[\s\S]*?credits to follow\.|Collection includes illustrative studies; these are marked as concepts\.|Explore our film and visual production work\.)(</p>)',lambda m:m[1]+note+m[2],index,count=1)
    outputs['index.html']=index
    script=(root/'script.js').read_text();data={p['id']:{k:p[k] for k in ['title','type','src','alt','copy','illustrative']} for p in projects}
    script=re.sub(r'const PROJECTS = \{[\s\S]*?\};\n  const order',lambda m:'const PROJECTS = '+json.dumps(data,ensure_ascii=True).replace('<','\\u003c')+';\n  const order',script,count=1)
    outputs['script.js']=script
    published=sorted((p for p in state['posts'] if p['published']),key=lambda p:p['date'],reverse=True)
    items=''
    for p in published:
        items+=f'<article class="insight-row"><time datetime="{p["date"]}">{p["date"]}</time><div><h2><a href="insights/{p["slug"]}.html">{e(p["title"])}</a></h2><p>{e(p["excerpt"])}</p></div><a class="service-cta" href="insights/{p["slug"]}.html">Read article <span aria-hidden="true">↗</span></a></article>'
        paragraphs=''.join('<p>'+e(t).replace('\n','<br>')+'</p>' for t in p['body'].split('\n\n') if t.strip())
        body=f'<article class="article-page"><a class="article-back" href="../insights.html">← All insights</a><time datetime="{p["date"]}">{p["date"]}</time><h1>{e(p["title"])}</h1><p class="article-intro">{e(p["excerpt"])}</p><div class="article-body">{paragraphs}</div></article>'
        outputs['insights/'+p['slug']+'.html']=shell(p['title']+' — SK Films Insights',p['excerpt'],body,'../')
    if not items:items='<div class="insights-empty"><h2>Stories are taking shape.</h2><p>Studio news, film notes and production insights will appear here when published.</p><a class="service-cta" href="index.html#work">Explore the collection <span aria-hidden="true">↗</span></a></div>'
    outputs['insights.html']=shell('Insights — SK Films Productions','Studio news, production updates and filmmaking insights from SK Films Productions.','<section class="services-intro"><p>SK Films Productions / Insights</p><h1>Notes from<br>the studio.</h1><div class="services-intro-bottom"><p>Ideas, process and perspectives<br>from behind the frame.</p></div></section><section class="insights-list" aria-label="Articles">'+items+'</section>')
    mapblock=''
    if settings['offices']:
        office_cards=''
        for o in settings['offices']:
            details='<h3>'+e(o['city'])+'</h3>'
            if o['approved']:
                if o['address']:details+='<address>'+e(o['address'])+'</address>'
                if o['mapUrl']:details+='<a class="service-cta" href="'+e(o['mapUrl'],quote=True)+'" target="_blank" rel="noopener noreferrer">Open Google Maps <span aria-hidden="true">↗</span></a>'
                if o['embedUrl']:details+='<iframe src="'+e(o['embedUrl'],quote=True)+'" title="'+e(o['city'],quote=True)+' office on Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>'
            office_cards+='<article class="office-card">'+details+'</article>'
        mapblock='<section class="studio-location" id="locations" data-mood="locations" data-bg="#F2F0EB" data-text="#1C1C1C" data-nav="contact" data-label="Our offices" aria-labelledby="locationTitle"><div><p class="label">SK Films Productions</p><h2 id="locationTitle">Our offices.</h2></div><div class="office-grid">'+office_cards+'</div></section>'
    outputs['index.html']=re.sub(r'<!-- LOCATION START -->[\s\S]*?<!-- LOCATION END -->','<!-- LOCATION START -->'+mapblock+'<!-- LOCATION END -->',outputs['index.html'])
    # Metadata is regenerated as a single block, so repeated saves do not duplicate tags.
    for name in list(outputs)+['services.html']:
        if not name.endswith('.html'):continue
        page=outputs.get(name,(root/name).read_text() if (root/name).exists() else '')
        page=re.sub(r'<!-- SEO START -->[\s\S]*?<!-- SEO END -->','',page)
        if name=='index.html':
            page=re.sub(r'<title>.*?</title>','<title>'+e(settings['homeTitle'])+'</title>',page,count=1)
            page=re.sub(r'<meta name="description" content="[^"]*">',lambda m:'<meta name="description" content="'+e(settings['homeDescription'],quote=True)+'">',page,count=1)
        title=re.search(r'<title>(.*?)</title>',page)[1];desc=re.search(r'<meta name="description" content="([^"]*)"',page)[1]
        canonical=(site+'/'+('' if name=='index.html' else name)) if site else ''
        meta=f'<!-- SEO START --><meta property="og:type" content="{"article" if name.startswith("insights/") else "website"}"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta name="twitter:card" content="summary_large_image">'
        if site:meta+=f'<link rel="canonical" href="{e(canonical,quote=True)}"><meta property="og:url" content="{e(canonical,quote=True)}"><meta property="og:image" content="{e(site)}/assets/hero-v2.webp">'
        schema={'@context':'https://schema.org','@type':'Organization','name':'SK Films Productions'}
        if site:schema['url']=site;schema['logo']=site+'/assets/logo.png'
        if name=='services.html':
            names=re.findall(r'<h2 id="title-[^"]+">(.*?)</h2>',page)
            schema['hasOfferCatalog']={'@type':'OfferCatalog','name':'Film and visual production services','itemListElement':[{'@type':'Offer','itemOffered':{'@type':'Service','name':unescape(n),'areaServed':[{'@type':'Country','name':'Pakistan'},{'@type':'City','name':'Dubai'}]}} for n in names]}
        if name.startswith('insights/'):
            post=next(p for p in published if name=='insights/'+p['slug']+'.html');schema={'@context':'https://schema.org','@type':'BlogPosting','headline':post['title'],'description':post['excerpt'],'datePublished':post['date'],'publisher':{'@type':'Organization','name':'SK Films Productions'}}
        meta+='<script type="application/ld+json">'+json.dumps(schema).replace('<','\\u003c')+'</script><!-- SEO END -->'
        outputs[name]=page.replace('</head>',meta+'</head>')
    urls=[site+'/'+('' if n=='index.html' else n) for n in outputs if n.endswith('.html')]+([site+'/services.html'] if site else [])
    outputs['sitemap.xml']='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+(''.join('<url><loc>'+e(u)+'</loc></url>' for u in dict.fromkeys(urls)) if site else '')+'</urlset>'
    outputs['robots.txt']='User-agent: *\nDisallow: /admin.html\nDisallow: /api/\nDisallow: /.admin-state/\nDisallow: /tools/\nDisallow: /archive/\n'+('Sitemap: '+site+'/sitemap.xml\n' if site else '# Set the approved website domain in admin to enable the sitemap.\n')
    # Fully render before writing. Inputs never become executable markup.
    for name,page in outputs.items():atomic(root/name,page)
    folder=root/'insights'
    if folder.exists():
        for p in folder.glob('*.html'):
            if str(p.relative_to(root)) not in outputs:p.unlink()
    public_settings={k:settings[k] for k in ['siteUrl','homeTitle','homeDescription']}
    public_settings['offices']=[{k:(o[k] if o['approved'] or k in ['city','approved'] else '') for k in ['city','address','mapUrl','embedUrl','approved']} for o in settings['offices']]
    atomic(root/'content/public.json',json.dumps({'projects':projects,'posts':published,'settings':public_settings},indent=2)+'\n')
    return list(outputs)
