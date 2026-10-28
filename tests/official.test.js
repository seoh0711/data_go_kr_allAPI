import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog,categories} from '../src/data.js';
test('official snapshot has complete, unique, categorized catalog with matched operation metadata',()=>{
 const {metadata,data}=JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url)));
 assert.equal(validateCatalog(data).length,metadata.sourceCount);
 assert.equal(data.length,metadata.count);
 assert.equal(new Set(data.map(d=>d.id)).size,data.length);
 assert.equal(metadata.operationMatchedLists,data.length);
 assert.equal(categories.reduce((n,c)=>n+data.filter(d=>d.category===c.name).length,0),data.length);
 for(const row of data){assert.ok(row.operationCount>0);assert.equal(row.url,`https://www.data.go.kr/data/${row.id}/openapi.do`)}
});
