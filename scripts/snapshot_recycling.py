"""Capture bounded official public bag-price rows, without authentication."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1]
URL='https://www.data.go.kr/data/15025538/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'시도명','시군구명','종량제봉투종류','20ℓ가격','데이터기준일자'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official table schema changed; snapshot retained.')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Columns changed')
  r=dict(zip(t['headers'][0],v));id='bag-'+hashlib.sha256('|'.join(v).encode()).hexdigest()[:16]
  if id in seen:continue
  if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['데이터기준일자']):raise SystemExit('Missing reference date')
  seen.add(id)
  prices={k[:-2]:value for k,value in r.items() if k.endswith('ℓ가격')}
  data.append(dict(id=id,region=r['시도명'],district=r['시군구명'],type=r['종량제봉투종류'],treatment=r['종량제봉투처리방식'],usage=r['종량제봉투용도'],target=r['종량제봉투사용대상'],prices=prices,organization=r['관리부서명'],phone=r['관리부서전화번호'],dataDate=r['데이터기준일자'],kind='snapshot'))
 if not 1<=len(data)<=500:raise SystemExit('Row count changed')
 meta=dict(sourceName='전국종량제봉투가격표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표에 표시된 일부 행만 수집. 전국 전체 가격표나 현재 판매 여부를 뜻하지 않습니다.')
 (ROOT/'public/recycling-bags.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
