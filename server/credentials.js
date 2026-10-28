// Common public-data portal key, with backwards-compatible per-provider overrides.
// Seoul Open Data Plaza issues its own key; never send the portal key there.
export function serviceCredential(env,source){
 const override=env[source.secret];
 if(typeof override==='string'&&override.trim())return override.trim();
 const common=env.DATA_GO_KR_SERVICE_KEY;
 return source.auth==='data-go-kr'&&typeof common==='string'&&common.trim()?common.trim():null;
}
