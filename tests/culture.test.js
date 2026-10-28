import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cultureSources,initialCultureFilters} from '../src/culture/config.js';
import {validateLibrarySnapshot,filterCulture,usableHours,hourText,publicWebsite,phoneHref,validateCultureFeed} from '../src/culture/model.js';
import {buildCultureFeed,normalizeCulture,parseCulturePayload,cultureWindow,onRequestGet} from '../functions/api/culture.js';
const snapshot=JSON.parse(readFileSync(new URL('../public/culture-libraries.json',import.meta.url)));
const filter=f=>({...initialCultureFilters,...f});
const source=key=>cultureSources.find(s=>s.key===key);
const reply=(key,items=[],total=0)=>({response:{header:key==='places'?{reseultCode:'00'}:{resultCode:'00'},body:{items:{item:items},totalCount:String(total)}}});
test('real public table snapshot has bounded unique records, honest coverage and no inferred fees',()=>{
 assert.ok(validateLibrarySnapshot(snapshot));assert.equal(snapshot.data.length,499);assert.equal(new Set(snapshot.data.map(r=>r.id)).size,499);assert.equal(Object.keys(snapshot.metadata.regionCounts).length,14);assert.equal(Object.values(snapshot.metadata.regionCounts).reduce((a,b)=>a+b,0),499);assert.ok(snapshot.metadata.coverage.includes('전체 도서관 목록이 아닙니다'));assert.ok(snapshot.data.every(r=>r.fee===null&&r.kind==='snapshot'));assert.equal(snapshot.metadata.oldestDataDate,'2026-01-13');assert.equal(snapshot.metadata.newestDataDate,'2026-09-28');
});
test('snapshot validator rejects duplicate ids, invalid hours and malformed fields',()=>{
 for(const mutate of [p=>p.data[1].id=p.data[0].id,p=>p.data[0].weekday=['25:00','30:00'],p=>p.data[0].closed={},p=>p.data[0].fee=0,p=>p.metadata.count=1]){const p=structuredClone(snapshot);mutate(p);assert.equal(validateLibrarySnapshot(p),null)}
});
test('search, region, type, timetable and shortlist combine without mutating source',()=>{
 const f=filterCulture(snapshot.data,filter({region:'서울특별시',type:'공공도서관',schedule:'evening'}));assert.ok(f.length>0);assert.ok(f.every(r=>r.region==='서울특별시'&&r.weekday[1]>'18:00'));const row=f[0];assert.equal(filterCulture(snapshot.data,filter({query:row.name,savedOnly:true}),[row.id]).length,1);assert.equal(filterCulture(snapshot.data,filter({query:'존재하지않는검색어'})).length,0);assert.equal(snapshot.data[0].name,'경상북도교육청 울릉도서관');
});
test('invalid filter values fail closed',()=>{
 for(const changes of [{query:'a'.repeat(101)},{query:null},{type:'invalid'},{schedule:'open-now'},{savedOnly:'yes'}])assert.deepEqual(filterCulture(snapshot.data,filter(changes)),[]);
});
test('equal midnight and missing times never mean open, weekend holiday is not Sunday',()=>{
 assert.equal(usableHours(['00:00','00:00']),false);assert.equal(hourText(['00:00','00:00']),'시간표 확인 필요');assert.equal(usableHours(['','']),false);assert.equal(hourText(['09:00','18:00']),'09:00 – 18:00');
 const row={...snapshot.data[0],weekday:['00:00','00:00'],saturday:['00:00','00:00'],holiday:['09:00','18:00']};assert.equal(filterCulture([row],filter({schedule:'saturday'})).length,0);
});
test('contact links reject executable URLs, credential URLs and unsafe phone schemes',()=>{
 for(const s of ['javascript:alert(1)','data:text/html,abc','https://user:pass@a.go.kr','http://127.0.0.1','https://localhost','http://a.go.kr:8080'])assert.equal(publicWebsite(s),null);
 assert.equal(publicWebsite('library.example.go.kr'),'https://library.example.go.kr/');assert.equal(phoneHref('02-123-4567'),'tel:021234567');assert.equal(phoneHref('javascript:alert(1)'),null);
});
test('KST event date window respects UTC day boundary and calendar rollover',()=>{
 assert.deepEqual(cultureWindow(new Date('2026-12-31T15:30:00Z')),{from:'20270101',to:'20270131'});
});
test('no key makes zero upstream calls and does not manufacture live records',async()=>{
 let calls=0;const r=await buildCultureFeed({}, {fetcher:()=>{calls++;throw Error()}});assert.equal(calls,0);assert.ok(r.sources.every(s=>s.status==='needs_key'&&!s.data.length));
});
test('common key fallback and optional override preserve auth without transmitting personal filters',async()=>{
 const calls=[];const r=await buildCultureFeed({DATA_GO_KR_SERVICE_KEY:'shared-culture',CULTURE_EVENTS_KEY:'event-override'},{now:()=>new Date('2026-10-26T00:00:00Z'),fetcher:async(u,opts)=>{calls.push(u);assert.equal(opts.redirect,'error');return Response.json(reply(u.pathname.includes('cultureinfo')?'events':'places'))}});
 assert.equal(calls.length,2);assert.equal(calls[0].searchParams.get('serviceKey'),'shared-culture');assert.equal(calls[1].searchParams.get('serviceKey'),'event-override');assert.equal(calls[1].searchParams.get('from'),'20261026');assert.equal(calls[1].searchParams.get('numOfrows'),'20');assert.ok(calls.every(u=>!u.searchParams.has('gpsxfrom')&&!u.searchParams.has('keyword')));assert.ok(r.sources.every(s=>s.status==='empty'));assert.ok(!JSON.stringify(r).includes('shared-culture'));
});
test('official facilities misspelled header, singleton XML and safe text are supported',()=>{
 const xml='<response><header><reseultCode>00</reseultCode></header><body><totalCount>1</totalCount><items><item><seq>A</seq><culName>책 &amp; 쉼</culName><culGrpName>도서관</culGrpName><culHomeUrl>javascript:alert(1)</culHomeUrl></item></items></body></response>';
 const r=normalizeCulture(source('places'),parseCulturePayload(xml));assert.equal(r.data[0].name,'책 & 쉼');assert.equal(r.data[0].website,null);assert.equal(r.data[0].fee,null);assert.equal(r.data[0].address,null);
});
test('partial provider failure keeps other source data and is not a fabricated success',async()=>{
 const r=await buildCultureFeed({DATA_GO_KR_SERVICE_KEY:'shared-culture'},{fetcher:async u=>{
 if(u.pathname.includes('cultureinfo'))throw Error('upstream');return Response.json(reply('places',[{seq:1,culName:'테스트 공간'}],1));
 }});assert.deepEqual(r.sources.map(s=>s.status),['live','error']);assert.equal(r.sources[0].data.length,1);
});
test('payload size, XML entities, malformed schema and reflected credentials fail safely',async()=>{
 for(const raw of ['<!DOCTYPE r [<!ENTITY a SYSTEM "file:///etc/passwd">]><r>&a;</r>','<x><a></x>','a'.repeat(2*1024*1024+1)])assert.throws(()=>parseCulturePayload(raw));assert.throws(()=>normalizeCulture(source('places'),reply('places',[{}],1)));
 const r=await buildCultureFeed({DATA_GO_KR_SERVICE_KEY:'shared-sensitive'},{fetcher:async u=>Response.json(reply(u.pathname.includes('cultureinfo')?'events':'places',[{seq:1,culName:'shared-sensitive',title:'shared-sensitive'}],1))});assert.ok(r.sources.every(s=>s.status==='error'));assert.ok(!JSON.stringify(r).includes('shared-sensitive'));
});
test('successful results cache by source and KST day without putting a secret in the cache key',async()=>{
 const map=new Map(),cache={match:async k=>map.get(k.url)?.clone(),put:async(k,r)=>map.set(k.url,r)};let calls=0;
 const options={cache,waitUntil:p=>p,fetcher:async u=>{calls++;return Response.json(reply(u.pathname.includes('cultureinfo')?'events':'places'))}};
 await buildCultureFeed({DATA_GO_KR_SERVICE_KEY:'cache-sensitive'},options);await buildCultureFeed({DATA_GO_KR_SERVICE_KEY:'cache-sensitive'},options);assert.equal(calls,2);assert.ok([...map.keys()].every(k=>!k.includes('cache-sensitive')));
});
test('server rejects user query parameters and browser rejects malformed feed',async()=>{
 const r=await onRequestGet({request:new Request('https://test/api/culture?region=서울'),env:{}});assert.equal(r.status,400);assert.equal(validateCultureFeed({checkedAt:new Date().toISOString(),sources:[]}),null);
});
