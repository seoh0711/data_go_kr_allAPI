// Public diagnostics are fixed enums and allowlisted provider codes only.
// Never return Error.message, stack, response text, URLs or request credentials.
const codes=new Set(['3','01','02','03','04','05','10','11','12','20','21','22','30','31','32','33','34','35','99','-401','-4','-5','-6','-7','-8','-9','-10','-11','-12','INFO-200','ERROR-290','ERROR-300']);
const transportCodes=new Set(['ENOTFOUND','ECONNREFUSED','ECONNRESET','ETIMEDOUT','EHOSTUNREACH','ERR_INVALID_URL','ERR_TLS_CERT_ALTNAME_INVALID','UND_ERR_CONNECT_TIMEOUT','ERR_NOT_IMPLEMENTED']);
export function providerFailure(error,stage='request',httpStatus=null){
 const own=error?.safeFailure;
 if(own){
  const kinds=['approval_required','authentication','ip_restricted','quota','no_data','provider_error','access_denied','http','response_format','redirect_blocked'];
  return {kind:kinds.includes(own.kind)?own.kind:'provider_error',stage:['provider','parse'].includes(own.stage)?own.stage:'provider',httpStatus:Number.isInteger(own.httpStatus)?own.httpStatus:null,providerCode:codes.has(String(own.providerCode))?String(own.providerCode):null};
 }
 const rawCode=String(error?.code??error?.cause?.code??'');
 const name=['Error','TypeError','SyntaxError','ReferenceError','TimeoutError','AbortError','RangeError'].includes(error?.name)?error.name:'Error';
 // These booleans identify common runtime faults without exposing any message text.
 const message=typeof error?.message==='string'?error.message.toLowerCase():'';
 let kind=stage==='cache_read'||stage==='cache_write'?'cache':stage==='parse'||stage==='normalize'?'response_format':'transport';
 if(name==='TimeoutError'||name==='AbortError')kind='timeout';
 else if(Number.isInteger(httpStatus)&&httpStatus>=400)kind=httpStatus===401?'authentication':httpStatus===403?'access_denied':'http';
 let runtimeHint=null;
 if(message.includes('illegal invocation'))runtimeHint='illegal_invocation';
 else if(message.includes('redirect'))runtimeHint='redirect_mode';
 else if(message.includes('abortsignal')||message.includes('abort signal')||message.includes("'signal'"))runtimeHint='abort_signal';
 else if(message.includes('dispatcher'))runtimeHint='node_dispatcher';
 else if(message.includes('is not a function'))runtimeHint='missing_function';
 else if(message.includes('cannot read properties'))runtimeHint='missing_runtime_property';
 else if(message.includes('invalid receiver'))runtimeHint='invalid_receiver';
 else if(message.includes('headers'))runtimeHint='invalid_headers';
 else if(message.includes('invalid url'))runtimeHint='invalid_target';
 else if(message.includes('proxy'))runtimeHint='proxy_configuration';
 else if(message.includes('not yet implemented')||message.includes('not implemented')||message.includes('unsupported')||message.includes('not supported'))runtimeHint='unsupported_runtime';
 else if(message.includes('fetch failed'))runtimeHint='fetch_failed';
 return {kind,stage,httpStatus:Number.isInteger(httpStatus)?httpStatus:null,errorClass:name,transportCode:transportCodes.has(rawCode)?rawCode:null,runtimeHint};
}
export function classifiedProviderError(payload,httpStatus=200){
 const auth=payload?.OpenAPI_ServiceResponse?.cmmMsgHeader??payload?.cmmMsgHeader;
 const h=auth??payload?.response?.header??payload?.header??payload?.wantedList??payload?.errorMessage??payload?.response??payload;
 const raw=h?.returnReasonCode??h?.resultCode??h?.code;
 const code=raw==null?null:String(raw);
 const tag=String(auth?.returnAuthMsg??'');
 let kind=null;
 if(tag==='SERVICE_ACCESS_DENIED_ERROR'||code==='20')kind='approval_required';
 else if(['SERVICE_KEY_IS_NOT_REGISTERED_ERROR','SERVICE_KEY_IS_NOT_REGISTERED'].includes(tag)||['30','31','-401','ERROR-290'].includes(code))kind='authentication';
 else if(tag==='UNREGISTERED_IP_ERROR'||code==='32')kind='ip_restricted';
 else if(['LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR','LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS'].includes(tag)||['21','22'].includes(code))kind='quota';
 else if(code==='03'||code==='3'||code==='INFO-200')kind='no_data';
 else if(code&& !['0','00','0000','INFO-000','200'].includes(code))kind='provider_error';
 if(!kind&&httpStatus!==200){kind=httpStatus===401?'authentication':httpStatus===403?'access_denied':'http'}
 if(!kind)return null;
 return {kind,stage:'provider',httpStatus,providerCode:codes.has(code)?code:null};
}
export function safeProviderException(failure){const error=new Error('Provider request failed');error.safeFailure=failure;return error}
