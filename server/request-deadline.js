// Cloudflare Workers and Node expose different AbortSignal static helpers.
// A request-local native controller works in both runtimes and is always cleared.
export function requestDeadline(milliseconds){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),milliseconds);
 return {signal:controller.signal,dispose(){clearTimeout(timer)}};
}
