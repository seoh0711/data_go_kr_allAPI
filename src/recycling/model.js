import {bagSourceUrl,bagVolumes,recyclingSources} from './config.js';
const text=v=>typeof v==='string'&&v.length<=6000;
export function validateBagSnapshot(p){
 if(p?.metadata?.sourceUrl!==bagSourceUrl||!Number.isFinite(Date.parse(p.metadata.collectedAt))||!Array.isArray(p.data)||p.data.length<1||p.data.length>500||p.metadata.count!==p.data.length)return null;
 const seen=new Set();for(const r of p.data){if(!r||!['id','region','district','type','treatment','usage','target','organization','phone','dataDate'].every(k=>text(r[k]))||!/^bag-[a-f0-9]{16}$/.test(r.id)||seen.has(r.id)||r.kind!=='snapshot'||!/^\d{4}-\d{2}-\d{2}$/.test(r.dataDate)||!r.region||!r.district||!r.prices||Object.keys(r.prices).length!==bagVolumes.length||!bagVolumes.every(k=>text(r.prices[k])))return null;seen.add(r.id)}return p;
}
export function bagPrice(raw){return /^\d+$/.test(String(raw))&&Number.isSafeInteger(Number(raw))&&Number(raw)>0?Number(raw).toLocaleString('ko-KR')+'원':'가격 확인 필요'}
export function filterBags(rows,f){if(typeof f?.query!=='string'||f.query.length>100||!['region','district','usage','target'].every(k=>typeof f[k]==='string')||!bagVolumes.includes(f.volume))return [];const q=f.query.trim().toLowerCase();return rows.filter(r=>(!q||[r.region,r.district,r.type,r.treatment,r.usage,r.target,r.organization].join(' ').toLowerCase().includes(q))&&['region','district','usage','target'].every(k=>f[k]==='전체'||r[k]===f[k]));}
export function validateRecyclingFeed(p){
 if(!Number.isFinite(Date.parse(p?.checkedAt))||!recyclingSources.some(s=>s.key===p.source?.key)||!['live','empty','error','needs_key'].includes(p.source.status)||!Array.isArray(p.source.data)||p.source.data.length>20)return null;
 if(p.source.status!=='live'&&p.source.data.length)return null;
 const fields=p.source.key==='items'?['id','name','method']:['id','name','address','hours','notes','registeredAt'];
 if(!p.source.data.every(r=>r&&fields.every(k=>text(r[k]))&&r.name))return null;return p;
}
