"""Bounded, keyless capture of official public sports facility rows."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections
ROOT=Path(__file__).resolve().parents[1]
URL='https://www.data.go.kr/data/15013117/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(URL,timeout=30).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and '개방시설유형구분' in t['headers'][0] and len(t['rows'])>0]
 if len(tables)!=1:raise SystemExit('Official table schema changed; snapshot retained.')
 t=tables[0];allowed={'축구장','체육관','다목적경기장','풋살경기장','족구장','테니스장','야구장','골프장','농구장','배드맨턴장','기타(파크골프장)','배드맨턴장+기타','테니스장+축구장','배드맨턴장+기타(탁구장)','배드맨턴장+농구장'};data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column mismatch')
  r=dict(zip(t['headers'][0],v))
  if r['개방시설유형구분'] not in allowed:continue
  address=r['소재지도로명주소'] or r['소재지지번주소'];name=r['개방시설명'];id='sports-'+hashlib.sha256((name+'|'+address).encode()).hexdigest()[:16]
  if id in seen:continue
  seen.add(id)
  data.append(dict(id=id,name=name,address=address,region=address.split()[0],type=r['개방시설유형구분'],closed=r['휴관일'],weekday=' – '.join([r['평일운영시작시각'],r['평일운영종료시각']]),weekend=' – '.join([r['주말운영시작시각'],r['주말운영종료시각']]),fee={'Y':'유료','N':'무료'}.get(r['유료사용여부'],'미제공'),feeRaw=r['사용료'],feeHours=r['사용기준시간'],method=r['신청방법구분'],amenities=r['부대시설정보'],organization=r['관리기관명'],website=r['홈페이지주소'],dataDate=r['데이터기준일자'],kind='snapshot'))
 if not 1<=len(data)<=500:raise SystemExit('Row count mismatch')
 meta=dict(sourceUrl=URL,sourceName='전국공공시설개방정보표준데이터',collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 첫 일부에서 체육시설 유형만 선별. 전국 전체 시설 목록이 아닙니다.')
 (ROOT/'public/sports-snapshot.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
