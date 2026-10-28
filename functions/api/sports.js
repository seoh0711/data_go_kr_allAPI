import {workerFetch} from '../../server/worker-fetch.js';
import {checkedProviderBody} from '../../server/provider-body.js';
import {requestDeadline} from '../../server/request-deadline.js';
import {providerFailure} from '../../server/provider-failure.js';
import {serviceCredential} from '../../server/credentials.js';
import {sportsSource} from '../../src/sports/config.js';
const text=v=>typeof v==='string'||typeof v==='number'?String(v).slice(0,6000):'';
export function normalizeSports(p){
 const root=p.response??p,header=root.header??root,body=root.body??root;
 if(!['0','00','0000'].includes(String(header.resultCode))||!/^\d+$/.test(String(body.totalRows)))throw Error('schema');
 const items=body.items?.item??body.items??body.data??body.item??[];const list=Array.isArray(items)?items:items&&typeof items==='object'?[items]:[];
 const data=list.slice(0,20).map((r,i)=>({id:'gyeryong:'+i+':'+text(r.FCLTY_NM),name:text(r.FCLTY_NM),address:text(r.LOCPLC_RDNMADR||r.LOCPLC_LNM_ADRES),region:'충청남도',type:'미제공',closed:'미제공',weekday:'미제공',weekend:'미제공',fee:'미제공',feeRaw:'',feeHours:'',method:text(r.RESVE_MTH),amenities:text(r.FCLTY_STTUS),organization:'충청남도 계룡시',website:'',dataDate:'2021-09-01',kind:'live'})).filter(r=>r.name&&r.address);
 if(Number(body.totalRows)>0&&!data.length)throw Error('schema');return {data,total:Number(body.totalRows)};
}
export async function buildSportsFeed(env,{fetcher=workerFetch,cache=null,origin='https://data-go-kr-api-atlas.pages.dev',now=()=>new Date(),waitUntil=p=>p.catch(()=>{})}={}){
 const base={key:'gyeryong',status:'needs_key',data:[],total:null,fetchedAt:null};const key=serviceCredential(env,sportsSource);let stage='request',httpStatus=null,budget;
 const wrap=source=>({checkedAt:now().toISOString(),source});if(!key)return wrap(base);
 try{const ck=new Request(origin+'/_sports-cache/v1');stage='cache_read';const cached=cache&&await cache.match(ck);if(cached)return wrap(await cached.json());
 stage='request';const target=new URL(sportsSource.endpoint);target.search=new URLSearchParams({serviceKey:key,currentPage:'1',perPage:'20'});budget=requestDeadline(10000);
 const response=await fetcher(target,{signal:budget.signal,redirect:'error',headers:{Accept:'application/json'}});httpStatus=response.status;stage='parse';const payload=await checkedProviderBody(response);stage='normalize';const normalized=normalizeSports(payload);
 if(JSON.stringify(normalized).includes(key))throw Error('credential_reflection');const result={...base,...normalized,status:normalized.data.length?'live':'empty',fetchedAt:now().toISOString()};if(cache)waitUntil(cache.put(ck,Response.json(result,{headers:{'Cache-Control':'public,max-age=900'}})));return wrap(result);
 }catch(e){const failure=providerFailure(e,stage,httpStatus);return wrap(failure.kind==='no_data'?{...base,status:'empty',total:0}:{...base,status:'error',failure})}finally{budget?.dispose()}
}
export async function onRequestGet({request,env,waitUntil}){if(new URL(request.url).search)return Response.json({error:'검색 조건은 브라우저에서만 적용됩니다.'},{status:400});return Response.json(await buildSportsFeed(env,{origin:new URL(request.url).origin,cache:globalThis.caches?.default,waitUntil}),{headers:{'Cache-Control':'public,max-age=30','X-Content-Type-Options':'nosniff'}})}
