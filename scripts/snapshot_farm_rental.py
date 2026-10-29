"""Capture public rental-office inventory facts; never availability or farmer identifiers."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15017325/standard.do'
MACHINES={'tractor':'트랙터및작업기보유대수','tiller':'경운기및작업기보유대수','cultivator':'관리기및작업기보유대수','rootHarvester':'땅속작물수확기보유대수','thresher':'탈곡기및정선작업기보유대수','seeder':'자주형파종기보유대수','transplanter':'이앙작업기보유대수','riceHarvester':'벼수확및운반작업기보유대수'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode();p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'사업소명','사업소전화번호','기타임대농기계보유정보'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official rental-office schema changed; snapshot retained')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));address=r['소재지도로명주소'] or r['소재지지번주소'];parts=address.split();row=dict(name=r['사업소명'],address=address,region=parts[0] if parts else '',district=parts[1] if len(parts)>1 else '원문 확인',phone=r['사업소전화번호'],other=r['기타임대농기계보유정보'],managerPhone=r['관리기관전화번호'],organization=r['관리기관명'],dataDate=r['데이터기준일자'],machines={k:r[v] for k,v in MACHINES.items()})
  if not row['name'] or not address or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate']):raise SystemExit('Missing public source metadata')
  row['id']='rental-'+hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:seen.add(row['id']);data.append(row)
 if not 1<=len(data)<=500:raise SystemExit('Public record bounds changed')
 meta=dict(sourceName='전국농기계임대정보표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage=f'공식 공개표 {len(t["rows"])}행에서 확인한 {len(data)}기록입니다. 조건·기준일이 다른 기록은 보존합니다. 전국 전체나 현재 대여 가능 수량·예약 정보가 아닙니다.')
 (ROOT/'public/farm-rental-offices.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
