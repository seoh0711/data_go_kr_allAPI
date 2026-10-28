import {workerFetch} from '../../server/worker-fetch.js';
import {checkedProviderBody} from '../../server/provider-body.js';
import {requestDeadline} from '../../server/request-deadline.js';
import {providerFailure} from '../../server/provider-failure.js';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {serviceCredential} from '../../server/credentials.js';
import {benefitSources,sourceUrl,regions} from '../../src/benefits/config.js';
import {safeOfficialUrl} from '../../src/benefits/model.js';
const MAX_BYTES=2*1024*1024;
const parser=new XMLParser({ignoreAttributes:true,parseTagValue:false,processEntities:true,removeNSPrefix:true});
const text=v=>typeof v==='string'||typeof v==='number'?String(v).slice(0,12000):'';
const list=v=>v==null||v===''?[]:Array.isArray(v)?v:[v];
const count=v=>/^\d+$/.test(String(v))?Number(v):null;
export function parsePayload(raw){
  if(new TextEncoder().encode(raw).length>MAX_BYTES||/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('invalid_payload');
  if(raw.trimStart().startsWith('{'))return JSON.parse(raw);
  if(XMLValidator.validate(raw)!==true)throw Error('invalid_xml');
  return parser.parse(raw);
}
function regionOf(value){
  const s=text(value);const r=regions.slice(1).find(r=>s.includes(r));
  return r?[r]:[];
}
function lifecycle(value){return ['청년','중장년','노년'].filter(age=>text(value).includes(age))}
function theme(value){const s=text(value);return /일자리|고용|취업/.test(s)?'일자리':/교육|훈련|장학/.test(s)?'교육':/주거|주택/.test(s)?'주거':'생활'}
export function normalizeBenefits(source,payload){
  let rows,total;
  if(source.key==='gov24'){
    if(!Array.isArray(payload.data)||!Number.isInteger(payload.totalCount)||payload.totalCount<0)throw Error('provider');
    total=payload.totalCount;
    rows=payload.data.map(v=>({id:text(v['서비스ID']),title:text(v['서비스명']),summary:text(v['서비스목적요약']||v['지원내용']),organization:text(v['소관기관명']),url:safeOfficialUrl(v['상세조회URL'],sourceUrl(source.id)),regions:regionOf(v['소관기관명']),ages:[],topic:theme(v['서비스분야']),updatedAt:text(v['수정일시'])}));
  }else{
    const root=source.key==='central'?payload.wantedList:(payload.response??payload.wantedList);
    if(!root||!['0','00'].includes(String(root.resultCode))||count(root.totalCount)===null)throw Error('provider');
    total=count(root.totalCount);
    rows=list(root.servList).map(v=>({id:text(v.servId),title:text(v.servNm),summary:text(v.servDgst),organization:text(v.jurMnofNm||v.bizChrDeptNm||source.organization),url:safeOfficialUrl(v.servDtlLink,sourceUrl(source.id)),regions:source.key==='central'?['전국']:regionOf(v.ctpvNm),ages:lifecycle(v.lifeNmArray||v.lifeArray),topic:theme(v.intrsThemaNmArray||v.intrsThemaArray),updatedAt:text(v.lastModYmd),registeredAt:text(v.svcfrstRegTs)}));
  }
  const seen=new Set();const data=rows.slice(0,source.limit).filter(v=>{
    if(!v.id||!v.title||seen.has(v.id))return false;
    seen.add(v.id);return true;
  }).map(v=>({...v,id:source.key+':'+v.id,kind:'live',sourceKey:source.key}));
  if(total>0&&!data.length)throw Error('schema');
  return {data,total,truncated:total>data.length};
}
async function readBounded(response){
  if(Number(response.headers.get('content-length'))>MAX_BYTES)throw Error('size');
  const reader=response.body.getReader();const decoder=new TextDecoder();let size=0,result='';
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw Error('size')}result+=decoder.decode(value,{stream:true})}return result+decoder.decode()}
  finally{reader.releaseLock()}
}
export async function buildBenefitsFeed(env,{fetcher=workerFetch,cache=null,origin='https://data-go-kr-api-atlas.pages.dev',now=()=>new Date(),waitUntil=p=>p.catch(()=>{})}={}){
  const sources=await Promise.all(benefitSources.map(async source=>{
    const base={key:source.key,id:source.id,status:'needs_key',data:[],total:null,truncated:false,fetchedAt:null};
    const key=serviceCredential(env,source);
    if(!key)return base;
    let stage='cache_read',httpStatus=null,budget=null;
    const cacheKey=new Request(origin+'/_benefits-cache/v2/'+source.id);
    try{
      const cached=cache&&await cache.match(cacheKey);
      if(cached)return await cached.json();
      stage='request';const target=new URL(source.endpoint);
      target.search=new URLSearchParams({serviceKey:key,...(source.key==='gov24'?{page:1,perPage:source.limit,returnType:'JSON'}:{pageNo:1,numOfRows:source.limit,...(source.key==='central'?{callTp:'L',srchKeyCode:'003'}:{})})});
      budget=requestDeadline(10000);const response=await fetcher(target,{signal:budget.signal,redirect:'error',headers:{Accept:source.format==='XML'?'application/xml':'application/json'}});
      httpStatus=response.status;stage='parse';
      const payload=await checkedProviderBody(response);stage='normalize';const normalized=normalizeBenefits(source,payload);
      // Never return a reflected credential even if an upstream payload is malformed.
      if(JSON.stringify(normalized).includes(key))throw Error('credential_reflection');
      const result={...base,...normalized,status:normalized.data.length?'live':'empty',fetchedAt:now().toISOString()};
      stage='cache_write';if(cache)waitUntil(cache.put(cacheKey,Response.json(result,{headers:{'Cache-Control':'public, max-age=1800'}})));
      return result;
    }catch(error){const failure=providerFailure(error,stage,httpStatus);return failure.kind==='no_data'?{...base,status:'empty',total:0,fetchedAt:now().toISOString()}:{...base,status:'error',failure}}finally{budget?.dispose()}
  }));
  return {checkedAt:now().toISOString(),scope:'각 기관 첫 100건 이내 · 전체 목록 아님',sources};
}
export async function onRequestGet({request,env,waitUntil}){
  // Search, age, region and bookmarks remain in browser memory; only a public
  // unfiltered catalogue may be requested from the server.
  if(new URL(request.url).search)return Response.json({error:'검색 조건은 브라우저에서만 적용됩니다.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const result=await buildBenefitsFeed(env,{cache:globalThis.caches?.default,origin:new URL(request.url).origin,waitUntil});
  return Response.json(result,{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}
