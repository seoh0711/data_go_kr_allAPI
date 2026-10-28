import test from 'node:test';
import assert from 'node:assert/strict';
import {requestDeadline} from '../server/request-deadline.js';
import {providerFailure,classifiedProviderError} from '../server/provider-failure.js';
test('native request deadline aborts without relying on AbortSignal.timeout',async()=>{
 const budget=requestDeadline(5);await new Promise(resolve=>budget.signal.addEventListener('abort',resolve,{once:true}));assert.equal(budget.signal.aborted,true);budget.dispose();
});
test('disposed request deadline does not abort completed work',async()=>{
 const budget=requestDeadline(5);budget.dispose();await new Promise(r=>setTimeout(r,10));assert.equal(budget.signal.aborted,false);
});
test('runtime diagnostics expose only fixed categories, never secret URLs or messages',()=>{
 const secret='private-key-unit-test';const error=new TypeError('AbortSignal.timeout is not a function https://example.test/?serviceKey='+secret);const failure=providerFailure(error,'request');assert.equal(failure.runtimeHint,'abort_signal');assert.equal(failure.errorClass,'TypeError');assert.ok(!JSON.stringify(failure).includes(secret));assert.ok(!JSON.stringify(failure).includes('https:'));
 assert.equal(providerFailure(new Error(secret),'request',401).kind,'authentication');assert.equal(providerFailure(new Error(secret),'cache_write').kind,'cache');
});
test('provider code classification separates approval, authentication, IP, quota and empty data',()=>{
 const classify=code=>classifiedProviderError({response:{header:{resultCode:code}}});assert.equal(classify('20').kind,'approval_required');assert.equal(classify('30').kind,'authentication');assert.equal(classify('32').kind,'ip_restricted');assert.equal(classify('22').kind,'quota');assert.equal(classify('03').kind,'no_data');assert.equal(classify('00'),null);assert.equal(classifiedProviderError({code:-401}).kind,'authentication');
});

test('native Worker fetch receives a URL string and retains the native receiver',async()=>{
 const {workerFetch}=await import('../server/worker-fetch.js');const original=globalThis.fetch;
 try{globalThis.fetch=function(input,options){assert.equal(this,globalThis);assert.equal(typeof input,'string');assert.equal(input,'https://example.test/path');return Promise.resolve(new Response('ok'))};await workerFetch(new URL('https://example.test/path'),{})}finally{globalThis.fetch=original}
});
test('checked body handles gateway XML auth errors without leaking upstream text or credential URLs',async()=>{
 const {checkedProviderBody}=await import('../server/provider-body.js');const privateValue='private-value-only-for-unit-test';
 const xml='<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_ACCESS_DENIED_ERROR</returnAuthMsg><returnReasonCode>20</returnReasonCode><errMsg>'+privateValue+'</errMsg></cmmMsgHeader></OpenAPI_ServiceResponse>';
 await assert.rejects(()=>checkedProviderBody(new Response(xml)),error=>{const f=providerFailure(error);assert.equal(f.kind,'approval_required');assert.equal(f.providerCode,'20');assert.ok(!JSON.stringify(f).includes(privateValue));return true});
 await assert.rejects(()=>checkedProviderBody(new Response('{"code":-401,"msg":"'+privateValue+'"}',{status:401})),error=>providerFailure(error).kind==='authentication');
});
test('HTTP errors and successful empty-result provider codes remain distinct',async()=>{
 const {checkedProviderBody}=await import('../server/provider-body.js');await assert.rejects(()=>checkedProviderBody(new Response('forbidden',{status:403})),error=>providerFailure(error).kind==='access_denied');await assert.rejects(()=>checkedProviderBody(Response.json({response:{header:{resultCode:'03'}}})),error=>providerFailure(error).kind==='no_data');
});
test('even an attached error object is sanitized before leaving the server',()=>{
 const f=providerFailure({safeFailure:{kind:'authentication',stage:'provider',providerCode:'private-key-that-must-not-be-returned',httpStatus:401,message:'private-value',url:'https://private.test/'}});assert.equal(f.providerCode,null);assert.ok(!JSON.stringify(f).includes('private'));
});

test('Worker native redirect mode is manual and credentials never follow a 3xx',async()=>{
 const {workerFetch}=await import('../server/worker-fetch.js');const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async function(input,options){calls++;assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://different-provider.test/'}})};await assert.rejects(()=>workerFetch(new URL('https://example.test/?serviceKey=private-key'),{redirect:'error'}),error=>{const f=providerFailure(error);assert.equal(f.kind,'redirect_blocked');assert.equal(f.httpStatus,302);assert.ok(!JSON.stringify(f).includes('private-key'));return true});assert.equal(calls,1)}finally{globalThis.fetch=original}
});

test('the live checked-body path rejects oversized bodies and XML external entities',async()=>{
 const {checkedProviderBody}=await import('../server/provider-body.js');for(const body of ['x'.repeat(2*1024*1024+1),'<!DOCTYPE r [<!ENTITY e SYSTEM "file:///private">]><r>&e;</r>'])await assert.rejects(()=>checkedProviderBody(new Response(body)),error=>providerFailure(error).kind==='response_format');
});
