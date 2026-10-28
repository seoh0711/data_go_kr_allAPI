import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const {metadata,data}=JSON.parse(readFileSync('dist/catalog.json','utf8'));
mkdirSync('dist/catalog',{recursive:true});
const chunks=[];
for(let i=0;i<data.length;i+=500){
 const name=`/catalog/part-${String(i/500).padStart(3,'0')}.json`;
 writeFileSync(`dist${name}`,JSON.stringify(data.slice(i,i+500)));
 chunks.push(name);
}
writeFileSync('dist/catalog.json',JSON.stringify({metadata,chunks}));
console.log(`Catalog packaged into ${chunks.length} chunks (${data.length} records).`);
