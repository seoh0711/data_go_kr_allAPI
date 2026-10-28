import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceCredential} from '../server/credentials.js';
test('only explicit public-data-portal sources inherit the shared key',()=>{
 const env={DATA_GO_KR_SERVICE_KEY:'common'};
 assert.equal(serviceCredential(env,{secret:'MISSING',auth:'data-go-kr'}),'common');
 assert.equal(serviceCredential(env,{secret:'SEOUL_SUBWAY_KEY',auth:'seoul'}),null);
 assert.equal(serviceCredential(env,{secret:'UNKNOWN'}),null);
 assert.equal(serviceCredential({...env,OVERRIDE:' override '},{secret:'OVERRIDE',auth:'data-go-kr'}),'override');
 assert.equal(serviceCredential({...env,OVERRIDE:' '},{secret:'OVERRIDE',auth:'data-go-kr'}),'common');
});
