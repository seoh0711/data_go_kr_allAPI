import {marketSourceUrl,facilityChoices} from './config.js';
const fields=['id','name','type','address','region','district','cycle','stalls','products','vouchers','website','toilet','parking','established','phone','dataDate'];
export function validateMarketSnapshot(p){if(p?.metadata?.sourceUrl!==marketSourceUrl||!Number.isFinite(Date.parse(p.metadata.collectedAt))||!Array.isArray(p.data)||p.data.length<1||p.data.length>500||p.metadata.count!==p.data.length)return null;const seen=new Set();for(const r of p.data){if(!r||!fields.every(k=>typeof r[k]==='string'&&r[k].length<=6000)||!r.name||!r.address||!/^market-[a-f0-9]{16}$/.test(r.id)||seen.has(r.id)||r.kind!=='snapshot'||!/^\d{4}-\d{2}-\d{2}$/.test(r.dataDate))return null;seen.add(r.id)}return p}
export function marketFacility(v){return v==='Y'?'Y':v==='N'?'N':'미제공'}
export function facilityLabel(v){return v==='Y'?'보유로 기재':v==='N'?'미보유로 기재':'미제공'}
export function filterMarkets(rows,f){if(typeof f?.query!=='string'||f.query.length>100||!['region','district','type'].every(k=>typeof f[k]==='string')||!facilityChoices.includes(f.toilet)||!facilityChoices.includes(f.parking))return [];const q=f.query.trim().toLowerCase();return rows.filter(r=>(!q||[r.name,r.address,r.products,r.cycle,r.vouchers].join(' ').toLowerCase().includes(q))&&['region','district','type'].every(k=>f[k]==='전체'||r[k]===f[k])&&['toilet','parking'].every(k=>f[k]==='전체'||marketFacility(r[k])===f[k]));}
export function marketParkingRows(feed,district,query){if(typeof district!=='string'||typeof query!=='string'||query.length>100)return [];const q=query.trim().toLowerCase();return (feed?.sources?.find(s=>s.key==='busan'&&s.status==='live')?.data||[]).filter(r=>(district==='전체'||parkingDistrict(r)===district)&&(!q||[r.name,r.address,r.district].join(' ').toLowerCase().includes(q)))}
export function marketCanReferenceParking(row){return row?.region==='부산광역시'}
// guNm is a management organization, not a district. Use explicit address tokens only.
const busanDistrictNames=['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'];
export function parkingDistrict(row){
 if(row?.region!=='부산광역시'||typeof row.address!=='string')return null;
 const parts=row.address.trim().split(/\s+/);if(['부산광역시','부산시','부산'].includes(parts[0]))parts.shift();
 return busanDistrictNames.includes(parts[0])?parts[0]:null;
}
