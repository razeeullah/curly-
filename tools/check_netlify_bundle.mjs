import {zipFunctions} from '@netlify/zip-it-and-ship-it';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const destination='output/netlify-functions';
mkdirSync(destination,{recursive:true});
const functions=await zipFunctions('netlify/functions',destination,{basePath:process.cwd(),config:{'*':{nodeBundler:'esbuild',includedFiles:['dist/*.html','dist/content/*.json'],includedFilesBasePath:process.cwd(),nodeVersion:'22'}},manifest:destination+'/manifest.json'});
for(const fn of functions){
 const files=execFileSync('unzip',['-Z1',fn.path],{encoding:'utf8'}).split('\n');
 for(const expected of ['dist/index.html','dist/content/public.json','dist/content/hosting.json','dist/content/image-catalog.json'])assert.ok(files.includes(expected),fn.name+': '+expected);
 assert.ok(!files.some(f=>f.includes('.admin-state/')||f.endsWith('.py')||f.includes('output/playwright/')));
 assert.equal(fn.runtimeAPIVersion,2);
 assert.ok(fn.routes.length>0);
}
assert.equal(functions.length,3);
const result=functions.map(({name,routes,runtimeAPIVersion})=>({name,routes,runtimeAPIVersion}));
writeFileSync(destination+'/verification.json',JSON.stringify({bundled:true,privateFilesExcluded:true,functions:result},null,2)+'\n');
console.log('PASS: three v2 Functions bundle with custom routes and required public templates; no Python or private editor files.');
