import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {classifiedProviderError,safeProviderException} from './provider-failure.js';
const MAX_BYTES=2*1024*1024;
const parser=new XMLParser({ignoreAttributes:true,parseTagValue:false,processEntities:true,removeNSPrefix:true});
export async function checkedProviderBody(response){
 let payload;
 try{
  if(Number(response.headers.get('content-length'))>MAX_BYTES||!response.body)throw Error('size');
  const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,raw='';
  try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();throw Error('size')}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}
  finally{reader.releaseLock()}
  if(/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('xml');
  if(raw.trimStart().startsWith('{'))payload=JSON.parse(raw);
  else {if(XMLValidator.validate(raw)!==true)throw Error('xml');payload=parser.parse(raw)}
 }catch(error){
  if(!response.ok)throw safeProviderException(classifiedProviderError({},response.status));
  if(['TimeoutError','AbortError'].includes(error?.name))throw error;
  throw safeProviderException({kind:'response_format',stage:'parse',httpStatus:response.status,providerCode:null});
 }
 const failure=classifiedProviderError(payload,response.status);
 if(failure)throw safeProviderException(failure);
 return payload;
}
