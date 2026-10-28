"""Capture a bounded official public park table without credentials or user locations."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15012890/standard.do'
PUBLIC_URL='https://www.data.go.kr/tcs/dss/selectStdDataDetailView.do?publicDataPk=15012890'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(PUBLIC_URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'관리번호','공원명','공원구분','공원면적','데이터기준일자'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official table schema changed; snapshot retained.')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));address=r['소재지도로명주소'] or r['소재지지번주소'];id='park-'+hashlib.sha256((r['관리번호']+'|'+r['공원명']+'|'+address).encode()).hexdigest()[:16]
  if id in seen:continue
  if not r['공원명'] or not address or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['데이터기준일자']):raise SystemExit('Missing reference metadata')
  seen.add(id);parts=address.split()
  data.append(dict(id=id,name=r['공원명'],type=r['공원구분'],address=address,region=parts[0],district=parts[1] if len(parts)>1 else '',area=r['공원면적'],sports=r['공원보유시설(운동시설)'],play=r['공원보유시설(유희시설)'],convenience=r['공원보유시설(편익시설)'],culture=r['공원보유시설(교양시설)'],other=r['공원보유시설(기타시설)'],organization=r['관리기관명'],phone=r['전화번호'],dataDate=r['데이터기준일자'],kind='snapshot'))
 if not 1<=len(data)<=500:raise SystemExit('Row count changed')
 meta=dict(sourceName='전국도시공원정보표준데이터',sourceUrl=URL,publicQueryUrl=PUBLIC_URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 첫 일부만 수집. 전국 전체 공원 목록이 아니며 현재 개방·시설 작동 여부를 뜻하지 않습니다.')
 (ROOT/'public/parks-snapshot.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
