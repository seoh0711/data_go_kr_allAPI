import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFeed,observationBase,normalize} from '../functions/api/commute.js';
import {departure,advice} from '../src/commute/model.js';
test('departure subtracts walking and buffer, with previous-day boundary',()=>{
 assert.deepEqual(departure('09:00',65,10,10),{time:'07:35',previousDay:false});
 assert.deepEqual(departure('00:20',30,10,10),{time:'23:30',previousDay:true});
});
test('KMA observation base uses KST and handles previous day',()=>{
 assert.deepEqual(observationBase(new Date('2026-10-25T15:10:00Z')),{base_date:'20261025',base_time:'2300'});
 assert.deepEqual(observationBase(new Date('2026-10-26T00:50:00Z')),{base_date:'20261026',base_time:'0900'});
});
test('missing keys make no external calls and never fabricate live data',async()=>{
 const r=await buildFeed(new URL('https://test/api/commute'),{},()=>{throw Error('must not call')});
 assert.equal(r.sources.length,4);assert.ok(r.sources.every(s=>s.status==='needs_key'&&s.data===null));
});
test('invalid queries are rejected before upstream calls',async()=>{
 for(const q of ['city=unknown','destination=bogus','busStation=1'])assert.ok((await buildFeed(new URL('https://test/?'+q),{})).error);
});
test('upstream failures are isolated without leaking provider URL or key',async()=>{
 const r=await buildFeed(new URL('https://test/?busStation=200000001'),{GYEONGGI_BUS_KEY:'secret-test',KMA_SERVICE_KEY:'secret-test'},async()=>{throw Error('secret-test')});
 assert.equal(r.sources.find(s=>s.key==='bus').status,'error');assert.equal(r.sources.find(s=>s.key==='air').status,'needs_key');assert.ok(!JSON.stringify(r).includes('secret-test'));
});
test('missing measurements stay null rather than being classified as good',()=>{
 const d=normalize('air',{response:{header:{resultCode:'00'},body:{items:[{pm25Value:'-',pm10Value:'',dataTime:'2026-10-26 08:00'}]}}});
 assert.equal(d.pm25,null);assert.equal(d.pm10,null);assert.equal(advice(null,d).length,0);
 assert.equal(advice({temperature:17,precipitation:1,rain:1},{pm25:42}).length,2);
});
test('successful source response supplies observations and all other sources remain disconnected',async()=>{
 const r=await buildFeed(new URL('https://test/?destination=강남'),{SEOUL_SUBWAY_KEY:'test-value'},async url=>{
 assert.equal(url.hostname,'swopenapi.seoul.go.kr');return Response.json({realtimeArrivalList:[{trainLineNm:'강남 방면',barvlDt:'120',arvlMsg2:'전역 출발',recptnDt:'2026-10-26 08:00:00'}]});
 });assert.equal(r.sources.find(s=>s.key==='subway').status,'live');assert.equal(r.sources.find(s=>s.key==='subway').data[0].seconds,120);
});

test('common portal key enables bus, weather and air but never authenticates Seoul',async()=>{
 const calls=[];
 const result=await buildFeed(new URL('https://test/?busStation=200000001'),{DATA_GO_KR_SERVICE_KEY:'shared-test'},async url=>{
  calls.push(url);assert.equal(url.hostname,'apis.data.go.kr');assert.equal(url.searchParams.get('serviceKey'),'shared-test');
  if(url.pathname.includes('busarrivalservice'))return Response.json({response:{msgHeader:{resultCode:0},msgBody:{busArrivalList:[]}}});
  return Response.json({response:{header:{resultCode:'00'},body:{items:[]}}});
 });
 assert.equal(calls.length,3);assert.equal(result.sources.find(s=>s.key==='subway').status,'needs_key');
 assert.ok(result.sources.filter(s=>s.key!=='subway').every(s=>s.status==='empty'));assert.ok(!JSON.stringify(result).includes('shared-test'));
});
test('commute overrides take precedence while other portal services use the common key',async()=>{
 const seen=[];
 await buildFeed(new URL('https://test/?busStation=200000001'),{DATA_GO_KR_SERVICE_KEY:'shared-test',GYEONGGI_BUS_KEY:'bus-override',SEOUL_SUBWAY_KEY:'seoul-only'},async(url,options)=>{
  assert.equal(options.redirect,'error');seen.push([url.hostname,url.pathname,url.searchParams.get('serviceKey')]);throw Error('test response');
 });
 assert.equal(seen.find(v=>v[1].includes('busarrivalservice'))[2],'bus-override');
 assert.ok(seen.filter(v=>v[0]==='apis.data.go.kr'&&!v[1].includes('busarrivalservice')).every(v=>v[2]==='shared-test'));
 const seoul=seen.find(v=>v[0]==='swopenapi.seoul.go.kr');assert.ok(seoul[1].includes('/seoul-only/'));assert.ok(!seoul[1].includes('shared-test'));
});
test('commute rejects an upstream payload reflecting the selected shared credential',async()=>{
 const r=await buildFeed(new URL('https://test/'),{DATA_GO_KR_SERVICE_KEY:'shared-sensitive'},async url=>{
  if(url.pathname.includes('ArpltnInfor'))return Response.json({response:{header:{resultCode:'00'},body:{items:[{pm25Value:20,dataTime:'shared-sensitive'}]}}});throw Error('test');
 });assert.equal(r.sources.find(s=>s.key==='air').status,'error');assert.ok(!JSON.stringify(r).includes('shared-sensitive'));
});
