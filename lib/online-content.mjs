import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeJSON = value => JSON.stringify(value).replace(/</g,'\\u003c');
const digest = v => createHash('sha256').update(v).digest('hex');
const mediaPattern = /^\/media\/[a-f0-9-]{36}\.(png|jpg|webp)$/;
const fail = message => { throw Object.assign(new Error(message), {status:422}); };
const text = (v,max,required=false) => {if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('Check required text fields and their lengths.');return v.trim();};
function google(value,embed=false){if(!value)return '';let url;try{url=new URL(value)}catch{fail('Use an HTTPS Google Maps URL.')}if(url.protocol!=='https:'||!['www.google.com','google.com','maps.google.com','maps.app.goo.gl','share.google'].includes(url.host)||url.username||url.password||(embed&&(url.host!=='www.google.com'||!url.pathname.startsWith('/maps/embed'))))fail('Use an approved Google Maps link or embed URL.');return value;}
export function validateContent(raw,assetNames){
 if(!raw||!Array.isArray(raw.projects)||raw.projects.length<1||raw.projects.length>50||!Array.isArray(raw.posts)||raw.posts.length>100)fail('Keep 1–50 projects and at most 100 articles.');
 const ids=new Set(),slugs=new Set();
 const projects=raw.projects.map(p=>{if(!Number.isInteger(p.id)||p.id<0||p.id>99999||ids.has(p.id))fail('Project IDs must be unique.');ids.add(p.id);const src=text(p.src,250,true);if(!assetNames.includes(src)&&!mediaPattern.test(src))fail('Choose a website image or upload a new one.');if(!["film", "commercial", "drama", "ads", "music", "visual"].includes(p.category)||typeof p.illustrative!=='boolean')fail('Choose a valid category and imagery status.');const crop=text(p.crop,40,true);if(!/^(?:100|\d{1,2})(?:\.\d+)?% (?:100|\d{1,2})(?:\.\d+)?%$/.test(crop))fail('Use two focal-point percentages, e.g. 50% 50%.');return {id:p.id,title:text(p.title,100,true),type:text(p.type,100,true),category:p.category,src,alt:text(p.alt,300,true),crop,copy:text(p.copy,3000,true),illustrative:p.illustrative};});
 const posts=raw.posts.map(p=>{const slug=text(p.slug,80,true);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slugs.has(slug))fail('Use a unique lowercase article slug.');slugs.add(slug);if(typeof p.published!=='boolean'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||Number.isNaN(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date)fail('Choose a valid article date and publishing status.');return {slug,title:text(p.title,140,true),excerpt:text(p.excerpt,320,true),body:text(p.body,30000,true),date:p.date,published:p.published};});
 const s=raw.settings||{},siteUrl=text(s.siteUrl||'',250).replace(/\/$/,'');if(siteUrl&&!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(siteUrl))fail('Use an HTTPS website domain with no path.');
 if(!Array.isArray(s.offices)||s.offices.length>8)fail('Keep at most eight offices.');
 const offices=s.offices.map(o=>{if(typeof o.approved!=='boolean')fail('Set office publication approval.');return {city:text(o.city,120,true),address:text(o.address||'',400),mapUrl:google(text(o.mapUrl||'',3000)),embedUrl:google(text(o.embedUrl||'',3000),true),approved:o.approved};});
 return {revision:raw.revision,projects,posts,settings:{siteUrl,homeTitle:text(s.homeTitle,160,true),homeDescription:text(s.homeDescription,320,true),offices}};
}
export function publicContent(data){const s=data.settings;return {projects:data.projects,posts:data.posts.filter(p=>p.published),settings:{siteUrl:s.siteUrl,homeTitle:s.homeTitle,homeDescription:s.homeDescription,offices:s.offices.map(o=>({city:o.city,approved:o.approved,address:o.approved?o.address:'',mapUrl:o.approved?o.mapUrl:'',embedUrl:o.approved?o.embedUrl:''}))}};}
export function createApp({store,seed,assets,password,now=()=>Date.now()}){
 const reply=(status,data,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
 const configured=()=>typeof password==='string'&&password.length>=16;
 const record=async()=>await store.getWithMetadata('content',{type:'json'})||{data:{revision:1,...structuredClone(seed)},etag:null};
 const current=async()=>{const entry=await record();return entry.data;};
 async function authenticated(req){if(!configured())return false;const token=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('sk_admin='))?.slice(9);if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return false;const key='sessions/'+digest(token),session=await store.get(key,{type:'json'});if(!session)return false;if(session.expires<now()||session.credential!==digest(password)){await store.delete(key);return false;}return {key};}
 async function attempts(ip){const key='attempts/'+digest(ip||'unknown');for(let i=0;i<5;i++){const old=await store.getWithMetadata(key,{type:'json'});const entry=old&&now()-old.data.start<300000?old.data:{start:now(),count:0};if(entry.count>=8)return false;const result=await store.setJSON(key,{...entry,count:entry.count+1},old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(result.modified)return true;}return false;}
 async function api(req,context={}){
  const url=new URL(req.url),action=url.pathname.split('/').filter(Boolean).at(-1);
  try{
   if(req.method==='GET'&&action==='public')return reply(200,publicContent(await current()));
   if(!['GET','POST'].includes(req.method))return reply(405,{error:'Method not allowed.'});
   if(req.method==='POST'&&(req.headers.get('origin')!==url.origin||req.headers.get('x-sk-admin')!=='1'))return reply(403,{error:'Same-origin editor requests only.'});
   if(!configured())return reply(503,{error:'Set SK_ADMIN_PASSWORD (at least 16 characters) in Netlify environment variables with Functions scope, then redeploy.'});
   let body;
   if(req.method==='POST'){if(Number(req.headers.get('content-length'))>6000000)return reply(413,{error:'Request too large.'});const bytes=await req.arrayBuffer();if(bytes.byteLength>6000000)return reply(413,{error:'Request too large.'});try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply(422,{error:'Invalid JSON.'})}if(!body||Array.isArray(body)||typeof body!=='object')return reply(422,{error:'JSON object required.'});}
   if(req.method==='POST'&&action==='login'){
    if(!await attempts(context.ip))return reply(429,{error:'Too many sign-in attempts. Wait five minutes.'});
    if(typeof body.password!=='string'||body.password.length>256||!timingSafeEqual(Buffer.from(digest(body.password)),Buffer.from(digest(password))))return reply(401,{error:'Incorrect administrator password.'});
    const token=randomBytes(32).toString('base64url');await store.setJSON('sessions/'+digest(token),{expires:now()+1800000,credential:digest(password)});
    return reply(200,{ok:true},{'Set-Cookie':`sk_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/; Max-Age=1800`});
   }
   const session=await authenticated(req);if(!session)return reply(401,{error:'Sign in to edit. Your unsaved changes remain available.'});
   if(req.method==='POST'&&action==='logout'){await store.delete(session.key);return reply(200,{ok:true},{'Set-Cookie':'sk_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/; Max-Age=0'});}
   if(req.method==='GET'&&action==='content')return reply(200,await current());
   if(req.method==='GET'&&action==='images'){const list=await store.list({prefix:'uploads/'});return reply(200,[...assets,...list.blobs.map(b=>'/media/'+b.key.slice(8)).filter(v=>mediaPattern.test(v))]);}
   if(req.method==='POST'&&action==='upload'){
    if(typeof body.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.data))fail('Invalid image data.');const bytes=Buffer.from(body.data,'base64');if(!bytes.length||bytes.length>4000000)fail('Choose an image below 4MB.');
    const ext=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':null;if(!ext)fail('Use a JPEG, PNG or WebP image.');
    const name=randomUUID()+'.'+ext;await store.set('uploads/'+name,new Uint8Array(bytes),{onlyIfNew:true,metadata:{contentType:ext==='jpg'?'image/jpeg':'image/'+ext}});return reply(201,{src:'/media/'+name});
   }
   if(req.method==='POST'&&action==='content'){
    const before=await record();if(body.revision!==before.data.revision)return reply(409,{error:'Another editor changed this content. Export your unsaved edits before reloading.'});
    const clean=validateContent(body,assets);
    for(const p of clean.projects)if(mediaPattern.test(p.src)&&!await store.getMetadata('uploads/'+p.src.split('/').at(-1)))fail('The selected uploaded image no longer exists.');
    clean.revision=before.data.revision+1;await store.setJSON('previous',before.data);
    const result=await store.setJSON('content',clean,before.etag?{onlyIfMatch:before.etag}:{onlyIfNew:true});if(!result.modified)return reply(409,{error:'Another save completed first. Reload before saving again.'});return reply(200,{ok:true,revision:clean.revision});
   }
   return reply(404,{error:'Unknown endpoint.'});
  }catch(error){if(error.status)return reply(error.status,{error:error.message});console.error('SK Films storage operation failed:',error.name);return reply(503,{error:'Content storage is temporarily unavailable. Your edits were not discarded; try again.'});}
 }
 async function media(req){const path=new URL(req.url).pathname;if(!mediaPattern.test(path))return new Response('Not found',{status:404});const entry=await store.getWithMetadata('uploads/'+path.split('/').at(-1),{type:'arrayBuffer'});if(!entry)return new Response('Not found',{status:404});return new Response(req.method==='HEAD'?null:entry.data,{headers:{'Content-Type':entry.metadata.contentType||'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});}
 return {api,media,current};
}
