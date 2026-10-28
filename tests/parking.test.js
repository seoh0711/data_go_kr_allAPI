import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parkingSources,initialParkingFilters} from '../src/parking/config.js';
import {validateParkingSnapshot,filterParking,feeCategory,rateText,moneyText,parkingHours,validateParkingFeed} from '../src/parking/model.js';
import {buildParkingFeed,normalizeParking,parseParkingPayload,onRequestGet} from '../functions/api/parking.js';
const snapshot=JSON.parse(readFileSync(new URL('../public/parking-snapshot.json',import.meta.url)));
const source=key=>parkingSources.find(s=>s.key===key);
const filters=f=>({...initialParkingFilters,...f});
const response=(items=[],total=0)=>({response:{header:{resultCode:'00'},body:{totalCount:String(total),items:{item:items}}}});
test('real public parking snapshot is bounded, unique, public-only and explicitly partial',()=>{
 assert.ok(validateParkingSnapshot(snapshot));assert.equal(snapshot.data.length,499);assert.equal(new Set(snapshot.data.map(r=>r.id)).size,499);assert.ok(snapshot.data.every(r=>r.category==='공영'&&r.remaining===null&&r.observedAt===null));assert.equal(Object.keys(snapshot.metadata.regions).length,3);assert.equal(Object.values(snapshot.metadata.fees).reduce((a,b)=>a+b,0),499);assert.ok(snapshot.metadata.coverage.includes('전체 공영주차장 목록이 아닙니다'));assert.equal(snapshot.metadata.oldestDataDate,'2026-07-29');assert.equal(snapshot.metadata.newestDataDate,'2026-10-01');
});
test('both official APIs are in the existing 12051 catalog and use portal auth',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url)));for(const s of parkingSources){assert.ok(catalog.data.some(r=>r.id===s.id));assert.equal(s.auth,'data-go-kr');assert.equal(new URL(s.endpoint).hostname,'apis.data.go.kr')}
});
test('snapshot validation rejects duplicates, invented remaining spaces and malformed text',()=>{
 for(const mutate of [p=>p.data[1].id=p.data[0].id,p=>p.data[0].remaining=10,p=>p.data[0].notes={},p=>p.data[0].category='민영',p=>p.metadata.count=1]){const p=structuredClone(snapshot);mutate(p);assert.equal(validateParkingSnapshot(p),null)}
});
test('search, region, type, fee and shortlist filters combine without changing input',()=>{
 const r=filterParking(snapshot.data,filters({region:'인천광역시',fee:'유료',type:'노외'}));assert.ok(r.length>0);assert.ok(r.every(v=>v.region==='인천광역시'&&v.feeType==='유료'&&v.type==='노외'));const row=r[0];assert.equal(filterParking(snapshot.data,filters({query:row.name,savedOnly:true}),[row.id]).length,1);assert.equal(filterParking(snapshot.data,filters({query:'아무데도없는이름'})).length,0);assert.equal(snapshot.data[0].name,'남동근린공원');
});
test('invalid and excessive filters fail closed',()=>{
 for(const f of [{query:null},{query:'x'.repeat(101)},{type:'unknown'},{fee:'cheap'},{savedOnly:'yes'}])assert.deepEqual(filterParking(snapshot.data,filters(f)),[]);
});
test('zero base fee never implies a free category or a complete total fare',()=>{
 assert.equal(feeCategory('유료'),'유료');assert.equal(feeCategory(''), '미제공');assert.equal(feeCategory('주말 무료'),'미제공');assert.equal(rateText('30','0'),'30분 / 0원');assert.equal(rateText('0','100'),'시간·요금 원문 확인');assert.equal(moneyText('0'),'0원');assert.equal(moneyText(''),'미제공');assert.equal(filterParking([{...snapshot.data[0],feeType:'유료',baseFee:'0'}],filters({fee:'무료'})).length,0);
});
test('original valid H:mm and 24:00 are displayed but equal/missing hours never imply open',()=>{
 assert.equal(parkingHours(['8:00','24:00']),'8:00 – 24:00');assert.equal(parkingHours(['00:00','00:00']),'운영시간 원문 확인');assert.equal(parkingHours(['','']),'운영시간 원문 확인');assert.equal(parkingHours(['27:00','29:00']),'운영시간 원문 확인');
});
test('no key makes no upstream requests or fabricated data',async()=>{
 let calls=0;const r=await buildParkingFeed({}, {fetcher:()=>{calls++;throw Error()}});assert.equal(calls,0);assert.ok(r.sources.every(s=>s.status==='needs_key'&&!s.data.length));
});
test('common key fallback, provider override and the case-sensitive ServiceKey parameter work',async()=>{
 const calls=[];const r=await buildParkingFeed({DATA_GO_KR_SERVICE_KEY:'common-test',PARKING_AVAILABILITY_KEY:'availability-override'},{fetcher:async(u,o)=>{assert.equal(o.redirect,'error');calls.push(u);return Response.json(response())}});
 assert.equal(calls[0].searchParams.get('ServiceKey'),'common-test');assert.equal(calls[0].searchParams.has('serviceKey'),false);assert.equal(calls[1].searchParams.get('serviceKey'),'availability-override');assert.ok(calls.every(u=>u.searchParams.get('numOfRows')==='20'&&!u.searchParams.has('keyword')&&!u.searchParams.has('lat')));assert.ok(r.sources.every(s=>s.status==='empty'));assert.ok(!JSON.stringify(r).includes('common-test'));
});
test('Busan metadata preserves original fee units and never treats ambiguous currava as remaining',()=>{
 const r=normalizeParking(source('busan'),response([{mgntNum:'1',pkNam:'검증용',pkGubun:'공영',pkCnt:'100',currava:'21',pkBascTime:'10',tenMin:'100',feeInfo:'유료',svcSrtTe:'8:00',svcEndTe:'20:00'}],1));assert.equal(r.data[0].remaining,null);assert.equal(r.data[0].baseMinutes,'10');assert.equal(r.data[0].baseFee,'100');assert.equal(r.data[0].capacity,'100');
});
test('provider-reported available spaces use curravacnt rather than occupied/total, keeping zero',()=>{
 const normalize=r=>normalizeParking(source('availability'),response([r],1)).data[0];const base={parkgcd:'1',parknm:'검증용',maxcnt:'100',parkingcnt:'97',curravacnt:'3',lastupdatetime:'2026-10-26 09:00:00'};
 assert.equal(normalize(base).remaining,3);assert.equal(normalize({...base,curravacnt:'0'}).remaining,0);assert.equal(normalize({...base,curravacnt:'-1'}).remaining,null);const bad=normalize({...base,curravacnt:'101'});assert.equal(bad.remaining,null);assert.ok(bad.notes.includes('일치하지'));assert.equal(normalize(base).observedAt,base.lastupdatetime);
});
test('partial failure preserves a valid other source and XML singleton response is supported',async()=>{
 const xml='<response><header><resultCode>00</resultCode></header><body><totalCount>1</totalCount><items><item><parkgcd>1</parkgcd><parknm>주차 &amp; 안내</parknm><maxcnt>10</maxcnt><curravacnt>0</curravacnt></item></items></body></response>';
 const r=await buildParkingFeed({DATA_GO_KR_SERVICE_KEY:'common-test'},{fetcher:async u=>{if(u.pathname.includes('BusanPblc'))throw Error();return new Response(xml)}});assert.deepEqual(r.sources.map(s=>s.status),['error','live']);assert.equal(r.sources[1].data[0].name,'주차 & 안내');assert.equal(r.sources[1].data[0].remaining,0);
});
test('malformed schema, hostile XML, oversize bodies and reflected keys fail safely',async()=>{
 for(const s of ['<!DOCTYPE x [<!ENTITY a SYSTEM "file:///etc/passwd">]><x>&a;</x>','<x><y></x>','x'.repeat(2*1024*1024+1)])assert.throws(()=>parseParkingPayload(s));assert.throws(()=>normalizeParking(source('availability'),response([{}],1)));
 const r=await buildParkingFeed({DATA_GO_KR_SERVICE_KEY:'reflected-key'},{fetcher:async u=>Response.json(response([u.pathname.includes('BusanPblc')?{mgntNum:'1',pkNam:'reflected-key'}:{parkgcd:'1',parknm:'reflected-key'}],1))});assert.ok(r.sources.every(s=>s.status==='error'));assert.ok(!JSON.stringify(r).includes('reflected-key'));
});
test('cache TTLs differ for metadata and availability without putting a key in cache URLs',async()=>{
 const map=new Map(),ttls=[],cache={match:async k=>map.get(k.url)?.clone(),put:async(k,r)=>{ttls.push(r.headers.get('cache-control'));map.set(k.url,r)}};let calls=0;
 const opts={cache,waitUntil:p=>p,fetcher:async()=>{calls++;return Response.json(response())}};await buildParkingFeed({DATA_GO_KR_SERVICE_KEY:'cache-test'},opts);await buildParkingFeed({DATA_GO_KR_SERVICE_KEY:'cache-test'},opts);assert.equal(calls,2);assert.ok(ttls.includes('public, max-age=60')&&ttls.includes('public, max-age=900'));assert.ok([...map.keys()].every(k=>!k.includes('cache-test')));
});
test('query parameters are rejected and malformed client data cannot become a live card',async()=>{
 const r=await onRequestGet({request:new Request('https://test/api/parking?plate=private'),env:{}});assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(validateParkingFeed({checkedAt:new Date().toISOString(),sources:[]}),null);
});
