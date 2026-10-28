"""Deploy static assets to Cloudflare Pages. Credentials stay in the environment."""
import json,os,pathlib,subprocess,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
PROJECT='data-go-kr-api-atlas'
def main():
    token=os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token: raise SystemExit('Set CLOUDFLARE_API_TOKEN securely in environment settings first.')
    def api(path,payload=None,allow_missing=False):
        request=urllib.request.Request('https://api.cloudflare.com/client/v4/'+path,data=None if payload is None else json.dumps(payload).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(request,timeout=60) as r: result=json.load(r)
        except urllib.error.HTTPError as e:
            if allow_missing and e.code==404: return None
            raise SystemExit(f'Cloudflare API HTTP {e.code}; check network access and token permissions.') from None
        except urllib.error.URLError:
            raise SystemExit('Cloudflare API connection failed; check environment network settings.') from None
        if not result.get('success'): raise SystemExit('Cloudflare API rejected the operation. Check token permissions.')
        return result['result']
    account=os.environ.get('CLOUDFLARE_ACCOUNT_ID')
    if not account:
        accounts=api('accounts?per_page=50')
        if len(accounts)!=1: raise SystemExit('Set CLOUDFLARE_ACCOUNT_ID to select the deployment account (multiple or no accounts returned).')
        account=accounts[0]['id']
    if not account.isalnum(): raise SystemExit('Invalid Cloudflare account ID.')
    subprocess.run(['npm','run','build'],cwd=ROOT,check=True)
    # Confirm the static output has no injected key before uploading.
    for path in (ROOT/'dist').rglob('*'):
        if path.is_file():
            if path.stat().st_size>25*1024*1024: raise SystemExit('An asset exceeds the Cloudflare Pages 25 MiB limit.')
            content=path.read_bytes()
            for name in ['CLOUDFLARE_API_TOKEN','DATA_GO_KR_SERVICE_KEY','GYEONGGI_BUS_KEY','KMA_SERVICE_KEY','AIRKOREA_SERVICE_KEY','SEOUL_SUBWAY_KEY','BENEFITS_GOV24_KEY','BENEFITS_CENTRAL_KEY','BENEFITS_LOCAL_KEY','CULTURE_PLACES_KEY','CULTURE_EVENTS_KEY','PARKING_BUSAN_KEY','PARKING_AVAILABILITY_KEY','SPORTS_GYERYONG_KEY','RECYCLING_ITEMS_KEY','RECYCLING_CENTERS_KEY']:
                value=os.environ.get(name)
                if value and value.encode() in content: raise SystemExit('Credential found in build output; deployment aborted.')
    project=api(f'accounts/{account}/pages/projects/{PROJECT}',allow_missing=True)
    if project is None:
        api(f'accounts/{account}/pages/projects',{'name':PROJECT,'production_branch':'main'})
    process_env=dict(os.environ,CLOUDFLARE_ACCOUNT_ID=account,XDG_CONFIG_HOME='/workspace/.config',WRANGLER_SEND_METRICS='false')
    subprocess.run(['npm','exec','--cache','/workspace/.npm-cache','--','wrangler','pages','deploy','dist','--project-name',PROJECT,'--branch','main','--commit-dirty=true'],cwd=ROOT,env=process_env,check=True)
if __name__=='__main__':main()
