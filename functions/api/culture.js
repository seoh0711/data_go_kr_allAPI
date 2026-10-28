import {workerFetch} from '../../server/worker-fetch.js';
import {checkedProviderBody} from '../../server/provider-body.js';
import {requestDeadline} from '../../server/request-deadline.js';
import {providerFailure} from '../../server/provider-failure.js';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {serviceCredential} from '../../server/credentials.js';
import {cultureSources,cultureSourceUrl} from '../../src/culture/config.js';
import {publicWebsite} from '../../src/culture/model.js';
const MAX_BYTES=2*1024*1024;
const parser=new XMLParser({ignoreAttributes:true,parseTagValue:false,processEntities:true,removeNSPrefix:true});
const text=value=>typeof value==='string'||typeof value==='number'?String(value).slice(0,4000):'';
const list=value=>value==null||value===''?[]:Array.isArray(value)?value:[value];
export function cultureWindow(now=new Date()){
 const start=new Date(now.getTime()+9*3600000),end=new Date(start.getTime()+30*86400000);
 const compact=d=>d.toISOString().slice(0,10).replaceAll('-','');
 return {from:compact(start),to:compact(end)};
}
export function parseCulturePayload(raw){
 if(new TextEncoder().encode(raw).length>MAX_BYTES||/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('payload');
 if(raw.trimStart().startsWith('{'))return JSON.parse(raw);
 if(XMLValidator.validate(raw)!==true)throw Error('xml');return parser.parse(raw);
}
export function normalizeCulture(source,payload){
 const root=payload.response;
 // The official facilities schema spells the header field "reseultCode".
 const code=root?.header?.resultCode??root?.header?.reseultCode;
 if(!['0','00','0000'].includes(String(code))||!/^\d+$/.test(String(root?.body?.totalCount)))throw Error('provider');
 const total=Number(root.body.totalCount),seen=new Set();
 const data=list(root.body.items?.item).slice(0,20).map(row=>({
  id:source.key+':'+text(row.seq),name:text(source.key==='places'?row.culName:row.title),kind:'live',sourceId:source.id,sourceUrl:cultureSourceUrl(source.id),
  type:text(source.key==='places'?row.culGrpName:row.realmName)||'분류 미제공',region:text(row.area)||'지역 미제공',district:text(row.sigungu),address:null,closed:null,weekday:null,saturday:null,holiday:null,fee:null,
  venue:text(row.place),startDate:text(row.startDate),endDate:text(row.endDate),phone:source.key==='places'?text(row.culTel):'',website:source.key==='places'?publicWebsite(row.culHomeUrl):null,dataDate:null,
 })).filter(row=>{if(!row.name||row.id===source.key+':'||seen.has(row.id))return false;seen.add(row.id);return true});
 if(total>0&&!data.length)throw Error('schema');return {data,total,truncated:total>data.length};
}
async function readBounded(response){
 if(Number(response.headers.get('content-length'))>MAX_BYTES||!response.body)throw Error('size');
 const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,result='';
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw Error('size')}result+=decoder.decode(value,{stream:true})}return result+decoder.decode()}
 finally{reader.releaseLock()}
}
export async function buildCultureFeed(env,{fetcher=workerFetch,now=()=>new Date(),cache=null,origin='https://data-go-kr-api-atlas.pages.dev',waitUntil=p=>p.catch(()=>{})}={}){
 const period=cultureWindow(now());
 const sources=await Promise.all(cultureSources.map(async source=>{
  const base={key:source.key,id:source.id,status:'needs_key',data:[],total:null,fetchedAt:null,truncated:false};
  const key=serviceCredential(env,source);if(!key)return base;
  let stage='cache_read',httpStatus=null,budget=null;
  const cacheKey=new Request(origin+'/_culture-cache/v1/'+source.key+'/'+period.from);
  try{
   const cached=cache&&await cache.match(cacheKey);if(cached)return await cached.json();
   stage='request';const target=new URL(source.endpoint);target.search=new URLSearchParams({serviceKey:key,PageNo:1,numOfrows:20,...(source.key==='events'?period:{})});
   budget=requestDeadline(10000);const response=await fetcher(target,{signal:budget.signal,redirect:'error',headers:{Accept:'application/xml, application/json'}});
   httpStatus=response.status;stage='parse';const payload=await checkedProviderBody(response);stage='normalize';const normalized=normalizeCulture(source,payload);
   if(JSON.stringify(normalized).includes(key))throw Error('credential_reflection');
   const result={...base,...normalized,status:normalized.data.length?'live':'empty',fetchedAt:now().toISOString()};
   stage='cache_write';if(cache)waitUntil(cache.put(cacheKey,Response.json(result,{headers:{'Cache-Control':'public, max-age=3600'}})));return result;
  }catch(error){const failure=providerFailure(error,stage,httpStatus);return failure.kind==='no_data'?{...base,status:'empty',total:0,fetchedAt:now().toISOString()}:{...base,status:'error',failure}}finally{budget?.dispose()}
 }));return {checkedAt:now().toISOString(),period,sources};
}
export async function onRequestGet({request,env,waitUntil}){
 if(new URL(request.url).search)return Response.json({error:'검색 조건은 브라우저에서만 적용됩니다.'},{status:400,headers:{'Cache-Control':'no-store'}});
 const result=await buildCultureFeed(env,{cache:globalThis.caches?.default,origin:new URL(request.url).origin,waitUntil});
 return Response.json(result,{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}
