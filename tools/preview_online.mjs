// Test-only HTTPS adapter. All edits and uploads live in memory, never project files.
import https from 'node:https';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createApp} from '../lib/online-content.mjs';
import {createSite} from '../lib/online-render.mjs';
import {MemoryStore} from './memory-store.mjs';
const root=resolve('dist');
const read=name=>readFileSync(resolve(root,name),'utf8');
const app=createApp({store:new MemoryStore(),seed:JSON.parse(read('content/public.json')),assets:JSON.parse(read('content/image-catalog.json')),password:'test-only-password-not-production'});
const site=createSite({app,templates:{home:read('index.html'),services:read('services.html'),insights:read('insights.html'),notFound:read('404.html')}});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4','.woff2':'font/woff2','.svg':'image/svg+xml'};
https.createServer({key:readFileSync(process.env.SK_TEST_KEY),cert:readFileSync(process.env.SK_TEST_CERT)},async(req,res)=>{
 try{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const url=new URL(req.url,'https://127.0.0.1:8084');
 const request=new Request(url,{method:req.method,headers:req.headers,...chunks.length?{body:Buffer.concat(chunks)}:{}});
 let response;
 if(url.pathname.startsWith('/api/'))response=await app.api(request,{ip:'127.0.0.1'});
 else if(url.pathname.startsWith('/media/'))response=await app.media(request);
 else if(['/','/index.html','/services.html','/insights.html','/robots.txt','/sitemap.xml','/content/public.json'].includes(url.pathname)||url.pathname.startsWith('/insights/'))response=await site(request);
 else{const path=resolve(root,'.'+decodeURIComponent(url.pathname));response=path.startsWith(root+'/')&&existsSync(path)&&statSync(path).isFile()?new Response(readFileSync(path),{headers:{'Content-Type':types[extname(path)]||'application/octet-stream'}}):new Response('Not found',{status:404});}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500);res.end('Test adapter failure');}
}).listen(8084,'127.0.0.1',()=>console.log('Test-only online admin: https://127.0.0.1:8084/admin.html; in-memory storage.'));
