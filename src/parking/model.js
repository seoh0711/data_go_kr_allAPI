import {parkingTypes,parkingFees} from './config.js';
export function nonnegative(value){return /^\d+$/.test(String(value))&&Number.isSafeInteger(Number(value))?Number(value):null}
export function feeCategory(value){return ['무료','유료','혼합'].includes(value)?value:'미제공'}
export function rateText(minutes,amount){
 const m=nonnegative(minutes),fee=nonnegative(amount);
 return m!==null&&m>0&&fee!==null?`${m.toLocaleString()}분 / ${fee.toLocaleString()}원`:'시간·요금 원문 확인';
}
export function moneyText(value){const n=nonnegative(value);return n===null?'미제공':n.toLocaleString()+'원'}
export function parkingHours(pair){
 const time=v=>typeof v==='string'&&/^(?:[01]?\d|2[0-3]):[0-5]\d$|^24:00$/.test(v);
 return Array.isArray(pair)&&pair.length===2&&pair.every(time)&&pair[0]!==pair[1]?pair.join(' – '):'운영시간 원문 확인';
}
const strings=['id','name','region','district','category','type','address','capacity','operatingDays','feeType','baseMinutes','baseFee','extraMinutes','extraFee','dailyApplyTime','dailyFee','monthlyFee','payment','notes','phone','organization','dataDate'];
function validRow(row){return row&&strings.every(k=>typeof row[k]==='string')&&['weekday','saturday','holiday'].every(k=>Array.isArray(row[k])&&row[k].length===2&&row[k].every(v=>typeof v==='string'))}
export function validateParkingSnapshot(payload){
 if(!payload?.metadata||!Number.isFinite(Date.parse(payload.metadata.collectedAt))||!Array.isArray(payload.data)||payload.data.length<1||payload.data.length>500||payload.metadata.count!==payload.data.length)return null;
 const ids=new Set();
 for(const row of payload.data){
  if(!validRow(row)||!/^parking-[a-f0-9]{16}$/.test(row.id)||ids.has(row.id)||row.kind!=='snapshot'||row.category!=='공영'||!row.name||!row.address||row.remaining!==null||row.observedAt!==null||row.sourceUrl!=='https://www.data.go.kr/data/15012896/standard.do'||!/^\d{4}-\d{2}-\d{2}$/.test(row.dataDate))return null;
  ids.add(row.id);
 }
 return payload;
}
export function filterParking(rows,f,saved=[]){
 if(typeof f?.query!=='string'||f.query.length>100||typeof f.region!=='string'||!parkingTypes.includes(f.type)||!parkingFees.includes(f.fee)||typeof f.savedOnly!=='boolean')return [];
 const q=f.query.trim().toLocaleLowerCase('ko-KR');
 return rows.filter(r=>(!q||[r.name,r.address,r.region,r.district,r.organization].join(' ').toLocaleLowerCase('ko-KR').includes(q))&&(f.region==='전체'||r.region===f.region)&&(f.type==='전체'||r.type===f.type)&&(f.fee==='전체'||feeCategory(r.feeType)===f.fee)&&(!f.savedOnly||saved.includes(r.id)));
}
export function validateParkingFeed(p){
 if(!Number.isFinite(Date.parse(p?.checkedAt))||!Array.isArray(p.sources)||p.sources.length!==2)return null;
 const seen=new Set();
 const sources=p.sources.map(s=>{
  if(!s||!['busan','availability'].includes(s.key)||seen.has(s.key))return null;seen.add(s.key);
  const valid=['needs_key','live','empty','error'].includes(s.status)&&Array.isArray(s.data)&&s.data.length<=20&&s.data.every(r=>validRow(r)&&r.kind==='live'&&(r.remaining===null||nonnegative(r.remaining)!==null)&&(r.observedAt===null||typeof r.observedAt==='string')&&/^https:\/\/www\.data\.go\.kr\/data\/\d{8}\/openapi\.do$/.test(r.sourceUrl));
  return valid?s:{key:s.key,status:'error',data:[]};
 });return sources.includes(null)?null:{...p,sources};
}
