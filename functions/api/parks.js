import {buildFeed} from './commute.js';
import {parkCities} from '../../src/parks/config.js';
// Reuse only the already connected weather/air adapters. Never forward Seoul or bus credentials.
export async function buildParkFeed(city,env,{fetcher,now=()=>new Date()}={}){
 const restricted={DATA_GO_KR_SERVICE_KEY:env.DATA_GO_KR_SERVICE_KEY,KMA_SERVICE_KEY:env.KMA_SERVICE_KEY,AIRKOREA_SERVICE_KEY:env.AIRKOREA_SERVICE_KEY};
 const url=new URL('https://data-go-kr-api-atlas.pages.dev/api/commute');url.searchParams.set('city',city);
 const result=await buildFeed(url,restricted,fetcher);if(result.error)return result;
 const sources=result.sources.filter(s=>['weather','air'].includes(s.key)).map(s=>{if(s.status!=='live')return {...s,data:null};const d=s.data,nonnegative=v=>Number.isFinite(v)&&v>=0?v:null;return {...s,data:s.key==='weather'?{temperature:Number.isFinite(d.temperature)?d.temperature:null,rain:nonnegative(d.rain),wind:nonnegative(d.wind),observedAt:typeof d.observedAt==='string'?d.observedAt:''}:{pm25:nonnegative(d.pm25),pm10:nonnegative(d.pm10),observedAt:typeof d.observedAt==='string'?d.observedAt:''}}});
 return {city,checkedAt:now().toISOString(),sources};
}
export async function onRequestGet({request,env}){const url=new URL(request.url),city=url.searchParams.get('city'),keys=[...url.searchParams.keys()];if(keys.length!==1||keys[0]!=='city'||!Object.hasOwn(parkCities,city))return Response.json({error:'준비된 관측 참고 지역을 선택해 주세요.'},{status:400,headers:{'Cache-Control':'no-store'}});return Response.json(await buildParkFeed(city,env),{headers:{'Cache-Control':'public,max-age=120','X-Content-Type-Options':'nosniff'}})}
