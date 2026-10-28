"""Fetch official catalog with a server-only key; publish only normalized metadata."""
import os,json,time,urllib.request,urllib.parse,urllib.error,collections,datetime,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=pathlib.Path('/workspace/atlas-cache')
BASE='https://api.odcloud.kr/api/15077093/v1/'
def fetch(endpoint,extra):
    key=os.environ.get('DATA_GO_KR_SERVICE_KEY')
    if not key: raise SystemExit('DATA_GO_KR_SERVICE_KEY is required in the server environment.')
    rows=[]; expected=None
    for page in range(1,1001):
        params=dict(extra,page=page,perPage=1000,serviceKey=key)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(BASE+endpoint+'?'+urllib.parse.urlencode(params),timeout=60) as response: payload=json.load(response)
                break
            except Exception:
                if attempt==2: raise SystemExit(f'{endpoint} page {page} failed; existing published catalog preserved.')
                time.sleep(2**attempt)
        count=payload['matchCount']
        if expected is None: expected=count
        if expected!=count: raise SystemExit('Source changed during pagination; rerun to obtain a consistent snapshot.')
        batch=payload['data']
        if payload['page']!=page or len(batch)!=payload['currentCount']: raise SystemExit('Invalid pagination response')
        rows.extend(batch)
        print(endpoint,page,len(rows),'/',expected,flush=True)
        if len(rows)>=expected: break
        if not batch: raise SystemExit('Incomplete pagination')
        time.sleep(.2)
    if len(rows)!=expected: raise SystemExit('Source row count mismatch')
    CACHE.mkdir(parents=True,exist_ok=True)
    (CACHE/(endpoint+'.json')).write_text(json.dumps(rows,ensure_ascii=False))
    return rows,expected

def main():
    listings,total=fetch('dataset',{'cond[list_type::EQ]':'OPEN API'})
    operations,op_total=fetch('open-data-list',{})
    by_id=collections.defaultdict(list)
    for row in operations:
        if row.get('is_deleted')=='N' and row.get('is_list_deleted')=='N': by_id[str(row['list_id'])].append(row)
    aliases={'과학기술':'과학기술','통일외교안보':'통일외교안보'}
    catalog=[];seen=set();excluded=0
    for row in listings:
        if row.get('is_deleted')!='N': excluded+=1;continue
        identity=str(row['id'])
        if identity in seen: raise SystemExit('Duplicate source list ID')
        seen.add(identity); ops=by_id.get(identity,[])
        formats=sorted({f for o in ops for f in (o.get('data_format') or '').replace('+',',').split(',') if f.strip()})
        fmt='JSON' if any('JSON' in f for f in formats) else 'XML' if any('XML' in f for f in formats) else '기타'
        category=row.get('new_category_nm')
        if not category: raise SystemExit('Missing category')
        catalog.append(dict(id=identity,title=row['title'],category=aliases.get(category,category),organization=row['org_nm'],description=row.get('desc') or '제공기관의 상세 페이지에서 설명을 확인하세요.',format=fmt,tags=[t.strip() for t in (row.get('keywords') or '').split(',') if t.strip()],url=f'https://www.data.go.kr/data/{identity}/openapi.do',updatedAt=row.get('updated_at'),formats=formats,operationCount=len(ops)))
    if any(not by_id.get(x['id']) for x in catalog): raise SystemExit('Missing operation metadata; existing catalog preserved.')
    if not catalog: raise SystemExit('Empty catalog; existing catalog preserved.')
    metadata=dict(source=BASE+'dataset',collectedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceCount=total,count=len(catalog),excludedDeleted=excluded,operationRows=op_total,operationMatchedLists=sum(bool(by_id.get(x['id'])) for x in catalog),categories=dict(collections.Counter(x['category'] for x in catalog)))
    out=ROOT/'public'/'catalog.json';out.parent.mkdir(exist_ok=True)
    temp=out.with_suffix('.tmp');temp.write_text(json.dumps(dict(metadata=metadata,data=catalog),ensure_ascii=False,separators=(',',':')));temp.replace(out)
    print(json.dumps(metadata,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
