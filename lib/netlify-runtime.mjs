import {getStore} from '@netlify/blobs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createApp} from './online-content.mjs';
export const readPublic = name => readFileSync(join(process.cwd(),'dist',name),'utf8');
export function getApp(){
 const hosting=JSON.parse(readPublic('content/hosting.json'));const store=getStore({name:hosting.storeName,consistency:'strong'});return createApp({store,seed:JSON.parse(readPublic('content/public.json')),assets:JSON.parse(readPublic('content/image-catalog.json')),password:process.env.SK_ADMIN_PASSWORD});
}
