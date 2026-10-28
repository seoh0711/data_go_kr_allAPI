import {regions,ages,topics,initialFilters} from './config.js';
export function safeOfficialUrl(value,fallback='https://www.data.go.kr'){
  try {
    const u=new URL(value);
    if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)return fallback;
    if(!['gov.kr','go.kr'].some(domain=>u.hostname===domain||u.hostname.endsWith('.'+domain)))return fallback;
    u.protocol='https:';return u.href;
  }catch{return fallback}
}
export function validFilters(f){
  return typeof f?.query==='string'&&f.query.length<=100&&regions.includes(f.region)&&ages.includes(f.age)&&topics.includes(f.topic)&&typeof f.savedOnly==='boolean';
}
export function filterBenefits(rows,filters,saved=[]){
  if(!validFilters(filters))return [];
  const q=filters.query.trim().toLocaleLowerCase('ko-KR');
  return rows.filter(row=>{
    const text=[row.title,row.summary,row.organization].join(' ').toLocaleLowerCase('ko-KR');
    // Unknown age and region stay visible: incomplete source metadata is not a
    // reason to infer that someone cannot use a service.
    return (!q||text.includes(q))&&
      (filters.region==='전체'||!row.regions?.length||row.regions.some(r=>['전국','지역별',filters.region].includes(r)))&&
      (filters.age==='전체'||!row.ages?.length||row.ages.includes(filters.age))&&
      (filters.topic==='전체'||row.topic===filters.topic)&&
      (!filters.savedOnly||saved.includes(row.id));
  });
}
export function validateGuides(payload){
  if(!payload||!Array.isArray(payload.data)||!payload.metadata||payload.metadata.count!==payload.data.length||payload.data.length>100)return null;
  const ids=new Set();
  for(const row of payload.data){
    if(!row||typeof row.id!=='string'||!/^\d{8}$/.test(row.id)||ids.has(row.id)||typeof row.title!=='string'||typeof row.summary!=='string'||row.kind!=='guide'||!Array.isArray(row.regions)||!Array.isArray(row.ages)||!topics.includes(row.topic))return null;
    if(safeOfficialUrl(row.url,'')!==row.url||!row.url.startsWith('https://www.data.go.kr/data/'))return null;
    ids.add(row.id);
  }
  return payload;
}
export {initialFilters};
export function validateFeed(payload){
  if(!Array.isArray(payload?.sources)||payload.sources.length!==3||!Number.isFinite(Date.parse(payload.checkedAt)))return null;
  const keys=new Set();
  const sources=payload.sources.map(source=>{
    if(!['gov24','central','local'].includes(source?.key)||keys.has(source.key))return null;
    keys.add(source.key);
    if(!['needs_key','error','empty','live'].includes(source.status)||!Array.isArray(source.data))return {...source,status:'error',data:[]};
    const valid=source.data.length<=100&&source.data.every(row=>row&&typeof row.id==='string'&&typeof row.title==='string'&&typeof row.summary==='string'&&typeof row.organization==='string'&&Array.isArray(row.regions)&&Array.isArray(row.ages)&&topics.includes(row.topic)&&row.kind==='live'&&safeOfficialUrl(row.url,'')===row.url&&row.url.startsWith('https://'));
    return valid?source:{...source,status:'error',data:[]};
  });
  return sources.includes(null)?null:{...payload,sources};
}
