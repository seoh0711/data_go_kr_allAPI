// Workers accepts redirect:'manual'/'follow'. Enforce our 'error' policy manually
// so a credential never follows a provider redirect to another destination.
export async function workerFetch(input,options={}){
 const denyRedirect=options.redirect==='error';
 const response=await globalThis.fetch(input instanceof URL?input.href:input,{...options,...(denyRedirect?{redirect:'manual'}:{})});
 if(denyRedirect&&response.status>=300&&response.status<400){
  await response.body?.cancel();
  const error=new Error('Provider redirect denied');
  error.safeFailure={kind:'redirect_blocked',stage:'provider',httpStatus:response.status,providerCode:null};throw error;
 }
 return response;
}
