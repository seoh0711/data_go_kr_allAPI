import {snapshotUrl} from './config.js';
export function safeWebsite(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
const fields=['id','name','address','region','type','closed','weekday','weekend','fee','feeRaw','feeHours','method','amenities','organization','website','dataDate'];
export function validSportsRow(r){return r&&fields.every(k=>typeof r[k]==='string'&&r[k].length<=6000)&&r.name&&r.address&&['snapshot','live'].includes(r.kind)&&['무료','유료','미제공'].includes(r.fee)}
export function validateSportsSnapshot(p){
 if(p?.metadata?.sourceUrl!==snapshotUrl||!Number.isFinite(Date.parse(p.metadata.collectedAt))||!Array.isArray(p.data)||p.data.length<1||p.data.length>500||p.metadata.count!==p.data.length)return null;
 const seen=new Set();for(const r of p.data){if(!validSportsRow(r)||r.kind!=='snapshot'||!/^sports-[a-f0-9]{16}$/.test(r.id)||seen.has(r.id)||!/^\d{4}-\d{2}-\d{2}$/.test(r.dataDate))return null;seen.add(r.id)}return p;
}
export function filterSports(rows,f){
 if(typeof f?.query!=='string'||f.query.length>100||!['region','type','fee'].every(k=>typeof f[k]==='string')||!['전체','무료','유료','미제공'].includes(f.fee))return [];
 const q=f.query.trim().toLocaleLowerCase('ko-KR');return rows.filter(r=>(!q||[r.name,r.address,r.organization,r.amenities].join(' ').toLocaleLowerCase('ko-KR').includes(q))&&['region','type','fee'].every(k=>f[k]==='전체'||r[k]===f[k]));
}
export function validateSportsFeed(p){return Number.isFinite(Date.parse(p?.checkedAt))&&p.source?.key==='gyeryong'&&['live','empty','needs_key','error'].includes(p.source.status)&&Array.isArray(p.source.data)&&p.source.data.length<=20&&p.source.data.every(r=>validSportsRow(r)&&r.kind==='live')&&(!['error','needs_key','empty'].includes(p.source.status)||p.source.data.length===0)?p:null}
