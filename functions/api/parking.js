import {workerFetch} from '../../server/worker-fetch.js';
import {checkedProviderBody} from '../../server/provider-body.js';
import {requestDeadline} from '../../server/request-deadline.js';
import {providerFailure} from '../../server/provider-failure.js';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {serviceCredential} from '../../server/credentials.js';
import {parkingSources,parkingSourceUrl} from '../../src/parking/config.js';
import {nonnegative} from '../../src/parking/model.js';
const MAX_BYTES=2*1024*1024;
const parser=new XMLParser({ignoreAttributes:true,parseTagValue:false,processEntities:true,removeNSPrefix:true});
const text=v=>typeof v==='string'||typeof v==='number'?String(v).slice(0,6000):'';
const list=v=>v==null||v===''?[]:Array.isArray(v)?v:[v];
export function parseParkingPayload(raw){
 if(new TextEncoder().encode(raw).length>MAX_BYTES||/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('payload');
 if(raw.trimStart().startsWith('{'))return JSON.parse(raw);
 if(XMLValidator.validate(raw)!==true)throw Error('xml');return parser.parse(raw);
}
export function normalizeParking(source,payload){
 const root=payload.response??(source.key==='busan'?payload.getPblcPrkngInfo:null)??payload;
 const body=root.body??root,header=root.header??root;
 if(!['0','00','0000'].includes(String(header.resultCode??header.code))||nonnegative(body.totalCount)===null)throw Error('provider');
 const total=nonnegative(body.totalCount),seen=new Set();
 const data=list(Array.isArray(body.items)?body.items:body.items?.item??body.item).slice(0,20).map(row=>{
  const detailed=source.key==='busan',name=text(detailed?row.pkNam:row.parknm),address=detailed?text(row.doroAddr||row.jibunAddr):'',capacity=text(detailed?row.pkCnt:row.maxcnt);
  const originalRemaining=detailed?null:nonnegative(row.curravacnt),maximum=nonnegative(capacity);
  const inconsistent=originalRemaining!==null&&maximum!==null&&originalRemaining>maximum;
  return {id:source.key+':'+(text(detailed?row.mgntNum:row.parkgcd)||name+'|'+address),name,kind:'live',sourceId:source.id,sourceUrl:parkingSourceUrl(source.id),region:'부산광역시',district:detailed?text(row.guNm):'',category:detailed?text(row.pkGubun):'공영',type:detailed?text(row.pkFm):'',address,capacity,operatingDays:detailed?text(row.oprDay):'',weekday:detailed?[text(row.svcSrtTe),text(row.svcEndTe)]:['',''],saturday:detailed?[text(row.satSrtTe),text(row.satEndTe)]:['',''],holiday:detailed?[text(row.hldSrtTe),text(row.hldEndTe)]:['',''],feeType:detailed?text(row.feeInfo):'',baseMinutes:detailed?text(row.pkBascTime):'',baseFee:detailed?text(row.tenMin):'',extraMinutes:detailed?text(row.pkAddTime):'',extraFee:detailed?text(row.feeAdd):'',dailyApplyTime:detailed?text(row.ftDayApplytime):'',dailyFee:detailed?text(row.ftDay):'',monthlyFee:detailed?text(row.ftMon):'',payment:detailed?text(row.payMtd):'',notes:inconsistent?'기관의 가능 대수와 최대 대수가 일치하지 않아 가능 대수를 표시하지 않습니다.':detailed?text(row.spclNote):'',phone:detailed?text(row.tponNum):'',organization:detailed?'부산광역시':'부산시설공단',dataDate:detailed?text(row.fnlDt):'',remaining:inconsistent?null:originalRemaining,observedAt:detailed?null:text(row.lastupdatetime)||null};
 }).filter(row=>{if(!row.name||seen.has(row.id))return false;seen.add(row.id);return true});
 if(total>0&&!data.length)throw Error('schema');return {data,total,truncated:total>data.length};
}
async function readBounded(response){
 if(Number(response.headers.get('content-length'))>MAX_BYTES||!response.body)throw Error('size');
 const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,result='';
 try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();throw Error('size')}result+=decoder.decode(value,{stream:true})}return result+decoder.decode()}
 finally{reader.releaseLock()}
}
export async function buildParkingFeed(env,{fetcher=workerFetch,cache=null,origin='https://data-go-kr-api-atlas.pages.dev',now=()=>new Date(),waitUntil=p=>p.catch(()=>{})}={}){
 const sources=await Promise.all(parkingSources.map(async source=>{
  const base={key:source.key,id:source.id,status:'needs_key',data:[],total:null,truncated:false,fetchedAt:null};
  const key=serviceCredential(env,source);if(!key)return base;
  let stage='cache_read',httpStatus=null,budget=null;
  const cacheKey=new Request(origin+'/_parking-cache/v1/'+source.id);
  try{
   const cached=cache&&await cache.match(cacheKey);if(cached)return await cached.json();
   stage='request';const target=new URL(source.endpoint);target.search=new URLSearchParams({[source.key==='busan'?'ServiceKey':'serviceKey']:key,pageNo:1,numOfRows:20,resultType:'json'});
   budget=requestDeadline(10000);const response=await fetcher(target,{signal:budget.signal,redirect:'error',headers:{Accept:'application/json, application/xml'}});
   httpStatus=response.status;stage='parse';const payload=await checkedProviderBody(response);stage='normalize';const normalized=normalizeParking(source,payload);
   if(JSON.stringify(normalized).includes(key))throw Error('credential_reflection');
   const result={...base,...normalized,status:normalized.data.length?'live':'empty',fetchedAt:now().toISOString()};
   stage='cache_write';if(cache)waitUntil(cache.put(cacheKey,Response.json(result,{headers:{'Cache-Control':'public, max-age='+(source.key==='availability'?60:900)}})));return result;
  }catch(error){const failure=providerFailure(error,stage,httpStatus);return failure.kind==='no_data'?{...base,status:'empty',total:0,fetchedAt:now().toISOString()}:{...base,status:'error',failure}}finally{budget?.dispose()}
 }));return {checkedAt:now().toISOString(),sources};
}
export async function onRequestGet({request,env,waitUntil}){
 if(new URL(request.url).search)return Response.json({error:'검색 조건은 브라우저에서만 적용됩니다.'},{status:400,headers:{'Cache-Control':'no-store'}});
 const result=await buildParkingFeed(env,{cache:globalThis.caches?.default,origin:new URL(request.url).origin,waitUntil});
 return Response.json(result,{headers:{'Cache-Control':'public, max-age=30','X-Content-Type-Options':'nosniff'}});
}
