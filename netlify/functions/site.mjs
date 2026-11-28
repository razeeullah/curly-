import {getApp,readPublic} from '../../lib/netlify-runtime.mjs';
import {createSite} from '../../lib/online-render.mjs';
let templates;
export default async req=>{
 templates??={home:readPublic('index.html'),services:readPublic('services.html'),insights:readPublic('insights.html'),notFound:readPublic('404.html')};
 return createSite({app:getApp(),templates})(req);
};
export const config={path:['/','/index.html','/services','/services/','/services.html','/insights','/insights/','/insights.html','/insights/*','/sitemap.xml','/robots.txt','/content/public.json'],method:['GET','HEAD']};
