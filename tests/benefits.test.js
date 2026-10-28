import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {benefitSources,initialFilters} from '../src/benefits/config.js';
import {filterBenefits,validFilters,validateGuides,safeOfficialUrl,validateFeed} from '../src/benefits/model.js';
import {buildBenefitsFeed,normalizeBenefits,parsePayload,onRequestGet} from '../functions/api/benefits.js';
import {demoBenefits} from '../src/benefits/demo.js';
const guides=JSON.parse(readFileSync(new URL('../public/benefits-guides.json',import.meta.url)));
const source=key=>benefitSources.find(s=>s.key===key);
const filters=changes=>({...initialFilters,...changes});
const record={servId:'TEST01',servNm:'테스트 안내',servDgst:'공식 설명',servDtlLink:'https://www.bokjiro.go.kr/test',ctpvNm:'경기도',lifeNmArray:'청년',intrsThemaNmArray:'교육',lastModYmd:'20261026'};
test('public guides have real source ids and verbatim official descriptions, never sample benefits',()=>{
 assert.equal(validateGuides(guides),guides);const catalog=JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url)));
 assert.equal(guides.data.length,8);
 for(const row of guides.data){const original=catalog.data.find(d=>d.id===row.id);assert.ok(original);assert.equal(row.url,original.url);assert.equal(row.summary,original.description.replaceAll('\\r','').replaceAll('\\n','\n'));assert.equal(row.kind,'guide')}
});
test('search combines topic, region and age without excluding unknown metadata',()=>{
 assert.equal(filterBenefits(demoBenefits,filters({query:'배움',topic:'교육'})).length,1);
 const result=filterBenefits(demoBenefits,filters({region:'경기도',age:'노년'}));assert.deepEqual(result.map(r=>r.id),['demo-learning','demo-home']);
 const saved=filterBenefits(demoBenefits,filters({savedOnly:true}),['demo-home']);assert.equal(saved[0].id,'demo-home');assert.equal(filterBenefits(demoBenefits,filters({query:'없는검색어'})).length,0);
});
test('invalid/oversized filter inputs fail closed; defaults reset everything',()=>{
 for(const f of [filters({query:'a'.repeat(101)}),filters({region:'invalid'}),filters({age:'-1'}),filters({query:null}),filters({savedOnly:'yes'})]){assert.equal(validFilters(f),false);assert.deepEqual(filterBenefits(demoBenefits,f),[])}
 assert.equal(validFilters({...initialFilters}),true);
});
test('official links reject unsafe protocols, lookalike hosts, credentials and ports',()=>{
 for(const url of ['javascript:alert(1)','https://www.gov.kr.evil.test/a','https://www.gov.kr@evil.test','https://user:pass@www.gov.kr','https://www.gov.kr:444/a','data:text/html,abc','not-a-url'])assert.equal(safeOfficialUrl(url,'blocked'),'blocked');
 assert.equal(safeOfficialUrl('http://www.bokjiro.go.kr/a'),'https://www.bokjiro.go.kr/a');
});
test('no credentials means zero external requests and three explicit needs_key sources',async()=>{
 let calls=0;const r=await buildBenefitsFeed({}, {fetcher:()=>{calls++;throw Error()}});assert.equal(calls,0);assert.equal(r.sources.length,3);assert.ok(r.sources.every(s=>s.status==='needs_key'&&s.data.length===0));
});
test('central official XML schema is parsed including singleton and escaped text',()=>{
 const raw='<wantedList><resultCode>0</resultCode><totalCount>1</totalCount><servList><servId>A</servId><servNm>배움 &amp; 지원</servNm><servDgst>설명</servDgst><servDtlLink>https://www.bokjiro.go.kr/a</servDtlLink><lifeArray>청년</lifeArray></servList></wantedList>';
 const n=normalizeBenefits(source('central'),parsePayload(raw));assert.equal(n.data.length,1);assert.equal(n.data[0].id,'central:A');assert.deepEqual(n.data[0].ages,['청년']);assert.equal(n.total,1);assert.equal(n.data[0].title,'배움 & 지원');
});
test('local XML keeps declared region and never guesses eligibility',()=>{
 const n=normalizeBenefits(source('local'),{response:{resultCode:'00',totalCount:'1',servList:record}});assert.deepEqual(n.data[0].regions,['경기도']);assert.equal(n.data[0].topic,'교육');
 assert.deepEqual(normalizeBenefits(source('local'),{response:{resultCode:'0',totalCount:'1',servList:{...record,ctpvNm:'',lifeNmArray:''}}}).data[0].ages,[]);
});
test('government JSON limits result count and retains safe public fields only',()=>{
 const data=Array.from({length:101},(_,i)=>({'서비스ID':String(i),'서비스명':'공식 안내','지원내용':'설명','소관기관명':'서울특별시','서비스분야':'일자리','상세조회URL':'https://evil.test/','serviceKey':'must-not-escape'}));
 const r=normalizeBenefits(source('gov24'),{data,totalCount:101});assert.equal(r.data.length,100);assert.equal(r.truncated,true);assert.deepEqual(r.data[0].regions,['서울특별시']);assert.ok(!JSON.stringify(r).includes('must-not-escape'));assert.equal(r.data[0].url,'https://www.data.go.kr/data/15113968/openapi.do');
});
test('partial failure keeps successful sources, zero results are empty not errors',async()=>{
 const r=await buildBenefitsFeed({BENEFITS_GOV24_KEY:'unit-test',BENEFITS_CENTRAL_KEY:'unit-test',BENEFITS_LOCAL_KEY:'unit-test'},{fetcher:async url=>{
 if(url.hostname==='api.odcloud.kr')return Response.json({data:[],totalCount:0});if(url.pathname.includes('NationalWelfare'))throw Error('unit-test');return new Response('<response><resultCode>0</resultCode><totalCount>1</totalCount><servList><servId>A</servId><servNm>테스트</servNm></servList></response>');
 }});assert.deepEqual(r.sources.map(s=>s.status),['empty','error','live']);assert.ok(!JSON.stringify(r).includes('unit-test'));
});
test('XML entities, malformed XML, oversized payloads and schema failures are rejected',()=>{
 for(const raw of ['<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>','<response><x></response>','x'.repeat(2*1024*1024+1)])assert.throws(()=>parsePayload(raw));
 assert.throws(()=>normalizeBenefits(source('central'),{wantedList:{resultCode:'30',totalCount:0}}));assert.throws(()=>normalizeBenefits(source('gov24'),{data:[{}],totalCount:1}));
});
test('cache avoids another upstream call and does not expose credentials',async()=>{
 const map=new Map(),cache={match:async key=>map.get(key.url)?.clone(),put:async(key,value)=>map.set(key.url,value)};let calls=0;
 const opts={cache,waitUntil:async p=>await p,fetcher:async()=>{calls++;return Response.json({data:[],totalCount:0})}};
 await buildBenefitsFeed({BENEFITS_GOV24_KEY:'private-test'},opts);await buildBenefitsFeed({BENEFITS_GOV24_KEY:'private-test'},opts);assert.equal(calls,1);assert.ok([...map.keys()].every(k=>!k.includes('private-test')));
});
test('server rejects all filter parameters, keeping private choices out of upstream requests',async()=>{
 const response=await onRequestGet({request:new Request('https://test/api/benefits?age=30'),env:{}});assert.equal(response.status,400);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('client rejects malformed source feeds and does not accept unsafe provider links',()=>{
 assert.equal(validateFeed({sources:[]}),null);
 const r={checkedAt:new Date().toISOString(),sources:benefitSources.map(s=>({key:s.key,status:'needs_key',data:[]}))};assert.ok(validateFeed(r));r.sources[0]={key:'gov24',status:'live',data:[{id:'1',title:'a',summary:'b',organization:'c',regions:[],ages:[],topic:'生活',kind:'live',url:'javascript:alert(1)'}]};assert.equal(validateFeed(r).sources[0].status,'error');
});

test('reflected credentials in otherwise valid provider fields never escape',async()=>{
 const r=await buildBenefitsFeed({BENEFITS_GOV24_KEY:'reflected-secret-value'},{fetcher:async()=>Response.json({totalCount:1,data:[{'서비스ID':'a','서비스명':'reflected-secret-value','지원내용':'x'}]})});assert.equal(r.sources[0].status,'error');assert.ok(!JSON.stringify(r).includes('reflected-secret-value'));
});

test('one common portal key authenticates all three benefit sources',async()=>{
 const calls=[];
 const r=await buildBenefitsFeed({DATA_GO_KR_SERVICE_KEY:'shared-test'},{fetcher:async url=>{
  calls.push(url);assert.equal(url.searchParams.get('serviceKey'),'shared-test');
  if(url.hostname==='api.odcloud.kr')return Response.json({data:[],totalCount:0});
  return new Response(url.pathname.includes('NationalWelfare')?'<wantedList><resultCode>0</resultCode><totalCount>0</totalCount></wantedList>':'<response><resultCode>0</resultCode><totalCount>0</totalCount></response>');
 }});assert.equal(calls.length,3);assert.ok(r.sources.every(s=>s.status==='empty'));assert.ok(!JSON.stringify(r).includes('shared-test'));
});
test('benefit source override wins over common key and missing overrides use common key',async()=>{
 const calls=[];await buildBenefitsFeed({DATA_GO_KR_SERVICE_KEY:'shared-test',BENEFITS_GOV24_KEY:'government-override'},{fetcher:async url=>{calls.push(url);throw Error('test')}});
 assert.equal(calls.find(u=>u.hostname==='api.odcloud.kr').searchParams.get('serviceKey'),'government-override');assert.ok(calls.filter(u=>u.hostname==='apis.data.go.kr').every(u=>u.searchParams.get('serviceKey')==='shared-test'));
});
test('shared key reflection is removed from benefit payloads as with overrides',async()=>{
 const r=await buildBenefitsFeed({DATA_GO_KR_SERVICE_KEY:'shared-sensitive'},{fetcher:async url=>{
  if(url.hostname==='api.odcloud.kr')return Response.json({totalCount:1,data:[{'서비스ID':'a','서비스명':'shared-sensitive'}]});throw Error('test');
 }});assert.equal(r.sources[0].status,'error');assert.ok(!JSON.stringify(r).includes('shared-sensitive'));
});

test('local welfare supports the actual wantedList XML envelope as well as the documented response envelope',()=>{
 const p=parsePayload('<wantedList><resultCode>0</resultCode><resultMessage>정상</resultMessage><totalCount>1</totalCount><servList><servId>LOCAL01</servId><servNm>지자체 검증</servNm><servDgst>설명</servDgst><ctpvNm>경기도</ctpvNm><lastModYmd>20261026</lastModYmd></servList></wantedList>');const r=normalizeBenefits(source('local'),p);assert.equal(r.data.length,1);assert.equal(r.data[0].id,'local:LOCAL01');assert.equal(r.data[0].updatedAt,'20261026');
});
test('initial registration time is never presented as an update time',()=>{
 const r=normalizeBenefits(source('central'),{wantedList:{resultCode:'0',totalCount:'1',servList:{...record,lastModYmd:undefined,svcfrstRegTs:'20210903'}}});assert.equal(r.data[0].updatedAt,'');assert.equal(r.data[0].registeredAt,'20210903');
});
