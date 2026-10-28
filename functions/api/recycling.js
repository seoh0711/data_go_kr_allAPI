import {workerFetch} from '../../server/worker-fetch.js';
import {checkedProviderBody} from '../../server/provider-body.js';
import {requestDeadline} from '../../server/request-deadline.js';
import {providerFailure} from '../../server/provider-failure.js';
import {serviceCredential} from '../../server/credentials.js';
import {recyclingSources,itemChoices} from '../../src/recycling/config.js';
const text=v=>typeof v==='string'||typeof v==='number'?String(v).slice(0,6000):'';
const first=v=>Array.isArray(v)&&v.length===1?v[0]:v;
export function recyclingInput(url){const keys=[...url.searchParams.keys()];if(keys.some(k=>!['source','item'].includes(k))||new Set(keys).size!==keys.length)return null;const source=url.searchParams.get('source');if(!['items','centers'].includes(source))return null;const item=url.searchParams.get('item');return source==='items'?(itemChoices.includes(item)?{source,item}:null):item===null?{source,item:null}:null}
export function normalizeRecycling(source,p){
 const root=first(p.response??p),header=first(root.header??root),body=first(root.body??root);
 if(['3','03'].includes(String(header.resultCode)))return {data:[],total:0,truncated:false};
 if(!['0','00','0000'].includes(String(header.resultCode))||!/^\d+$/.test(String(body.totalCount)))throw Error('schema');
 const items=first(body.items),raw=items?.item??items??[];const list=Array.isArray(raw)?raw:raw&&typeof raw==='object'?[raw]:[];const seen=new Set();
 const data=list.slice(0,20).map((r,i)=>source==='items'?{id:'item:'+i,name:text(r.itemNm),method:text(r.dschgMthd)}:{id:'center:'+text(r.dataCd||i),name:text(r.emdNm)?text(r.emdNm)+' 재활용도움센터':'',address:text(r.rnAdres),hours:text(r.operTimeInfo),notes:text(r.etcCn),registeredAt:text(r.regDt)}).filter(r=>{if(!r.name||seen.has(r.id)||source==='items'&&!r.method||source==='centers'&&!r.address)return false;seen.add(r.id);return true});
 if(Number(body.totalCount)>0&&!data.length)throw Error('schema');return {data,total:Number(body.totalCount),truncated:Number(body.totalCount)>data.length};
}
export async function buildRecyclingFeed(input,env,{fetcher=workerFetch,cache=null,origin='https://data-go-kr-api-atlas.pages.dev',now=()=>new Date(),waitUntil=p=>p.catch(()=>{})}={}){
 const source=recyclingSources.find(s=>s.key===input.source);const base={key:source.key,status:'needs_key',data:[],total:null,truncated:false,fetchedAt:null};const wrap=s=>({checkedAt:now().toISOString(),source:s});const key=serviceCredential(env,source);if(!key)return wrap(base);let stage='cache_read',httpStatus=null,budget;
 try{const ck=new Request(origin+'/_recycling-cache/v1/'+source.key+'/'+encodeURIComponent(input.item||'all'));const cached=cache&&await cache.match(ck);if(cached)return wrap(await cached.json());
 stage='request';const url=new URL(source.endpoint);url.search=new URLSearchParams({serviceKey:key,pageNo:'1',numOfRows:'20',...(input.item?{itemNm:input.item}:{})});budget=requestDeadline(10000);const response=await fetcher(url,{signal:budget.signal,redirect:'error',headers:{Accept:'application/json'}});httpStatus=response.status;stage='parse';const p=await checkedProviderBody(response);stage='normalize';const normalized=normalizeRecycling(source.key,p);if(JSON.stringify(normalized).includes(key))throw Error('credential_reflection');const result={...base,...normalized,status:normalized.data.length?'live':'empty',fetchedAt:now().toISOString()};if(cache)waitUntil(cache.put(ck,Response.json(result,{headers:{'Cache-Control':'public,max-age=900'}})));return wrap(result);
 }catch(e){const failure=providerFailure(e,stage,httpStatus);if(source.key==='centers'&&e?.safeFailure?.providerCode==='33')failure.kind='authentication';return wrap(failure.kind==='no_data'||e?.safeFailure?.providerCode==='3'?{...base,status:'empty',total:0,fetchedAt:now().toISOString()}:{...base,status:'error',failure})}finally{budget?.dispose()}
}
export async function onRequestGet({request,env,waitUntil}){const url=new URL(request.url),input=recyclingInput(url);if(!input)return Response.json({error:'준비된 품목과 자료 종류를 선택해 주세요.'},{status:400,headers:{'Cache-Control':'no-store'}});const result=await buildRecyclingFeed(input,env,{cache:globalThis.caches?.default,origin:url.origin,waitUntil});return Response.json(result,{headers:{'Cache-Control':'public,max-age=30','X-Content-Type-Options':'nosniff'}})}
