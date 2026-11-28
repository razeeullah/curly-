import {getApp} from '../../lib/netlify-runtime.mjs';
export default async (req,context)=>getApp().api(req,context);
export const config={path:'/api/*',rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']}};
