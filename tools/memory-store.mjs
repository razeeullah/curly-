// Test/local-preview adapter only. Production functions use Netlify Blobs.
export class MemoryStore {
 constructor(){this.entries=new Map();this.counter=0;}
 async getWithMetadata(key,{type}={}){const entry=this.entries.get(key);if(!entry)return null;let data=structuredClone(entry.data);if(type==='arrayBuffer'&&data instanceof Uint8Array)data=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);return {data,etag:entry.etag,metadata:structuredClone(entry.metadata||{})};}
 async get(key,options){return (await this.getWithMetadata(key,options))?.data??null;}
 async getMetadata(key){const e=this.entries.get(key);return e?{etag:e.etag,metadata:e.metadata||{}}:null;}
 async set(key,data,options={}){const old=this.entries.get(key);if((options.onlyIfNew&&old)||(options.onlyIfMatch&&old?.etag!==options.onlyIfMatch))return {modified:false};const etag=String(++this.counter);this.entries.set(key,{data:structuredClone(data),metadata:options.metadata||{},etag});return {modified:true,etag};}
 async setJSON(key,data,options){return this.set(key,data,options);}
 async delete(key){this.entries.delete(key);}
 async list({prefix='' }={}){return {blobs:[...this.entries.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),directories:[]};}
}
