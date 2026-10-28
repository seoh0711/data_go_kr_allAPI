import {workerFetch} from '../../server/worker-fetch.js';
import {checkedProviderBody} from '../../server/provider-body.js';
import {requestDeadline} from '../../server/request-deadline.js';
import {providerFailure} from '../../server/provider-failure.js';
import {cities,sources} from '../../src/commute/config.js';
import {serviceCredential} from '../../server/credentials.js';
export function observationBase(now=new Date()){
 // 초단기실황은 정시 자료를 약 40분 이후 조회. 여유 5분을 둔다.
 const kst=new Date(now.getTime()+9*3600000-45*60000);
 return {base_date:kst.toISOString().slice(0,10).replaceAll('-',''),base_time:String(kst.getUTCHours()).padStart(2,'0')+'00'};
}
const list=v=>v==null?[]:Array.isArray(v)?v:[v];
const number=v=>v===null||v===undefined||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);
export function normalize(key,j){
 if(key==='subway'){
  if(j.errorMessage && !['INFO-000',200,'200'].includes(j.errorMessage.code))throw Error('provider');
  return list(j.realtimeArrivalList).slice(0,8).map(v=>({line:v.trainLineNm,message:v.arvlMsg2,direction:v.updnLine,seconds:number(v.barvlDt),observedAt:v.recptnDt}));
 }
 if(key==='bus'){
  if(String(j.response?.msgHeader?.resultCode)!=='0')throw Error('provider');
  return list(j.response?.msgBody?.busArrivalList).slice(0,10).map(v=>({route:String(v.routeName||v.routeId),minutes:number(v.predictTime1),seats:number(v.remainSeatCnt1),stops:number(v.locationNo1)}));
 }
 const r=j.response;
 if(!['00','0'].includes(String(r?.header?.resultCode)))throw Error('provider');
 if(key==='weather'){
  const items=list(r.body?.items?.item);if(!items.length)return null;
  const v=Object.fromEntries(items.map(i=>[i.category,number(i.obsrValue)]));
  return {temperature:v.T1H??null,rain:v.RN1??null,precipitation:v.PTY??null,wind:v.WSD??null,observedAt:items[0].baseDate+' '+items[0].baseTime};
 }
 const v=list(r.body?.items)[0];return v?{pm25:number(v.pm25Value),pm10:number(v.pm10Value),observedAt:v.dataTime}:null;
}
export async function buildFeed(url,env,fetcher=workerFetch){
 const city=url.searchParams.get('city')||'suwon',c=cities[city];
 const station=url.searchParams.get('destination')||'서울역',bus=url.searchParams.get('busStation')||'';
 if(!c||!['서울역','강남','여의도'].includes(station)||!/^\d{9}$|^$/.test(bus))return {error:'조회 조건을 확인해 주세요.'};
 const results=await Promise.all(sources.map(async s=>{
  const result={key:s.key,id:s.id,status:'needs_key',data:null};
  const key=serviceCredential(env,s);
  if(!key)return result;
  if(s.key==='bus'&&!bus)return {...result,status:'needs_station'};
  let stage='request',httpStatus=null,budget=null;
  try{
   let target;
   const api=(path,params)=>{const u=new URL('https://apis.data.go.kr/'+path);u.search=new URLSearchParams({serviceKey:key,...params}).toString();return u};
   if(s.key==='bus')target=api('6410000/busarrivalservice/v2/getBusArrivalListv2',{stationId:bus,format:'json'});
   if(s.key==='weather')target=api('1360000/VilageFcstInfoService_2.0/getUltraSrtNcst',{...observationBase(),nx:c.nx,ny:c.ny,dataType:'JSON',numOfRows:20,pageNo:1});
   if(s.key==='air')target=api('B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty',{stationName:c.air,dataTerm:'DAILY',ver:'1.3',returnType:'json',numOfRows:1,pageNo:1});
   if(s.key==='subway')target=new URL('https://swopenapi.seoul.go.kr/api/subway/'+encodeURIComponent(key)+'/json/realtimeStationArrival/0/8/'+encodeURIComponent(station));
   budget=requestDeadline(8000);const response=await fetcher(target,{signal:budget.signal,redirect:'error',headers:{Accept:'application/json'}});
   httpStatus=response.status;stage='parse';const payload=await checkedProviderBody(response);stage='normalize';const data=normalize(s.key,payload);
   if(JSON.stringify(data)?.includes(key))throw Error('credential_reflection');
   return {...result,status:data&&(!Array.isArray(data)||data.length)?'live':'empty',data};
  }catch(error){const failure=providerFailure(error,stage,httpStatus);return failure.kind==='no_data'?{...result,status:'empty'}:{...result,status:'error',failure}}finally{budget?.dispose()}
 }));
 return {city,destination:station,checkedAt:new Date().toISOString(),sources:results};
}
export async function onRequestGet({request,env}){
 const result=await buildFeed(new URL(request.url),env);
 return Response.json(result,{status:result.error?400:200,headers:{'Cache-Control':result.error?'no-store':'public, max-age=30','X-Content-Type-Options':'nosniff'}});
}
