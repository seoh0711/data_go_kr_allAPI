"""Capture bounded public security-light records and catalog references without credentials."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15017320/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'보안등위치명','설치형태','설치연도','관리기관전화번호'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official lighting schema changed; snapshot retained')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));address=r['소재지도로명주소'] or r['소재지지번주소'];parts=address.split()
  row=dict(name=r['보안등위치명'],address=address,region=parts[0] if parts else '',district=parts[1] if len(parts)>1 else '',neighborhood=parts[2] if len(parts)>2 and re.search('[읍면동]$',parts[2]) else '원문 확인',count=r['설치개수'],year=r['설치연도'],type=r['설치형태'],phone=r['관리기관전화번호'],organization=r['관리기관명'],dataDate=r['데이터기준일자'])
  if not row['name'] or not address or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate']):raise SystemExit('Missing source metadata')
  row['id']='light-'+hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:seen.add(row['id']);data.append(row)
 if not 1<=len(data)<=500:raise SystemExit('Public row bounds changed')
 meta=dict(sourceName='전국보안등정보표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 일부입니다. 이번 수집은 원문 지역명 전남광주통합특별시 진도군 499기록에 한정합니다. 전국 전체나 실시간 점등·고장 상태가 아닙니다.')
 (ROOT/'public/lighting-snapshot.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False))
 catalog=json.loads((ROOT/'public/catalog.json').read_text());ids=['15076278','15085472','15110685'];refs=[]
 for id in ids:
  r=next(r for r in catalog['data'] if r['id']==id);refs.append({k:r[k] for k in ['id','title','organization','description','url']})
 (ROOT/'public/lighting-api-guides.json').write_text(json.dumps(dict(metadata=dict(sourceName='데이터 아틀라스 공공데이터포털 API 목록',sourceUrl='https://www.data.go.kr',collectedAt=catalog['metadata'].get('collectedAt',catalog['metadata'].get('fetchedAt',meta['collectedAt'])),verifiedAt=meta['collectedAt'],count=3,coverage='기존 12,051 API 목록 중 세 지역의 공식 문서 안내입니다. 해당 지역 시설·점등·고장 데이터를 조회한 결과가 아닙니다.'),data=refs),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
