import {initialCultureFilters,libraryTypes,schedules} from './config.js';
export function publicWebsite(value){
 if(typeof value!=='string'||!value.trim())return null;
 try{const raw=value.trim(),url=new URL(raw.includes('://')?raw:'https://'+raw);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||!url.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.)/.test(url.hostname))return null;
  // Preserve the published protocol: upgrading an unverified institutional site
  // can create a broken link. Links open only on an explicit user click.
  return url.href;
 }catch{return null}
}
export function phoneHref(value){return typeof value==='string'&&/^0[0-9-]{7,18}$/.test(value)?'tel:'+value.replaceAll('-',''):null}
export function validTime(value){return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)}
export function usableHours(pair){return Array.isArray(pair)&&pair.length===2&&pair.every(validTime)&&pair[0]!==pair[1]}
export function hourText(pair){return usableHours(pair)?pair.join(' – '):'시간표 확인 필요'}
export function validateLibrarySnapshot(payload){
 if(!payload?.metadata||!Number.isFinite(Date.parse(payload.metadata.collectedAt))||!Array.isArray(payload.data)||payload.data.length<1||payload.data.length>500||payload.metadata.count!==payload.data.length)return null;
 const ids=new Set();
 for(const row of payload.data){
  if(!row||!/^library-[a-f0-9]{16}$/.test(row.id)||ids.has(row.id)||row.kind!=='snapshot'||row.fee!==null||typeof row.name!=='string'||!row.name||typeof row.region!=='string'||typeof row.address!=='string'||!row.address||!libraryTypes.includes(row.type)||!/^\d{4}-\d{2}-\d{2}$/.test(row.dataDate))return null;
  if(!['name','region','district','address','closed','phone','website','dataDate'].every(k=>typeof row[k]==='string'))return null;
  if(!['weekday','saturday','holiday'].every(k=>Array.isArray(row[k])&&row[k].length===2&&row[k].every(v=>v===''||validTime(v))))return null;
  if(row.sourceUrl!=='https://www.data.go.kr/data/15013109/standard.do')return null;
  ids.add(row.id);
 }
 return payload;
}
export function filterCulture(rows,filters,saved=[]){
 if(typeof filters?.query!=='string'||filters.query.length>100||typeof filters.region!=='string'||!libraryTypes.includes(filters.type)||!schedules.some(v=>v.value===filters.schedule)||typeof filters.savedOnly!=='boolean')return [];
 const q=filters.query.trim().toLocaleLowerCase('ko-KR');
 return rows.filter(row=>(!q||[row.name,row.address,row.region,row.district,row.type].join(' ').toLocaleLowerCase('ko-KR').includes(q))&&
  (filters.region==='전체'||row.region===filters.region)&&
  (filters.type==='전체'||row.type===filters.type)&&
  (filters.schedule==='all'||filters.schedule==='evening'&&usableHours(row.weekday)&&row.weekday[1]>'18:00'||filters.schedule==='saturday'&&usableHours(row.saturday))&&
  (!filters.savedOnly||saved.includes(row.id)));
}
export function validateCultureFeed(payload){
 if(!Number.isFinite(Date.parse(payload?.checkedAt))||!Array.isArray(payload.sources)||payload.sources.length!==2)return null;
 const keys=new Set();
 const sources=payload.sources.map(s=>{
  if(!s||!['places','events'].includes(s.key)||keys.has(s.key))return null;keys.add(s.key);
  const valid=['needs_key','empty','live','error'].includes(s.status)&&Array.isArray(s.data)&&s.data.length<=20&&s.data.every(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.region==='string'&&typeof r.type==='string'&&r.kind==='live'&&r.fee===null&&['venue','startDate','endDate','phone'].every(k=>typeof r[k]==='string')&&typeof r.sourceUrl==='string'&&/^https:\/\/www\.data\.go\.kr\/data\/\d{8}\/openapi\.do$/.test(r.sourceUrl));
  return valid?s:{key:s.key,status:'error',data:[]};
 });return sources.includes(null)?null:{...payload,sources};
}
export {initialCultureFilters};
