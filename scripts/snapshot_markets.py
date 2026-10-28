"""Bounded keyless capture of official traditional market table rows."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15012894/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'시장명','시장유형','시장개설주기','취급품목','데이터기준일자'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official market schema changed; snapshot retained.')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));address=r['소재지도로명주소'] or r['소재지지번주소'];id='market-'+hashlib.sha256((r['시장명']+'|'+address).encode()).hexdigest()[:16]
  if id in seen:continue
  if not r['시장명'] or not address or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['데이터기준일자']):raise SystemExit('Missing source metadata')
  seen.add(id);parts=address.split()
  data.append(dict(id=id,name=r['시장명'],type=r['시장유형'],address=address,region=parts[0],district=parts[1] if len(parts)>1 else '',cycle=r['시장개설주기'],stalls=r['점포수'],products=r['취급품목'],vouchers=r['사용가능상품권'],website=r['홈페이지주소'],toilet=r['공중화장실보유여부'],parking=r['주차장보유여부'],established=r['개설연도'],phone=r['전화번호'],dataDate=r['데이터기준일자'],kind='snapshot'))
 if not 1<=len(data)<=500:raise SystemExit('Public row count changed')
 meta=dict(sourceName='전국전통시장표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),types=dict(collections.Counter(r['type'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 일부만 수집. 전국 전체 시장 목록이나 현재 영업·상품권 사용 가능 여부를 뜻하지 않습니다.')
 (ROOT/'public/markets-snapshot.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
