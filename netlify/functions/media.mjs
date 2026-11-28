import {getApp} from '../../lib/netlify-runtime.mjs';
export default async req=>getApp().media(req);
export const config={path:'/media/*',method:['GET','HEAD']};
