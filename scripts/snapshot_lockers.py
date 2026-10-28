"""Capture bounded public parcel-locker facility metadata, never parcel or user identifiers."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15034534/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'시설명','택배함종류코드','무료이용시간','사용방법설명','데이터기준일자'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official locker table schema changed; snapshot retained.')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));address=r['소재지도로명주소'] or r['소재지지번주소'];id='locker-'+hashlib.sha256('|'.join(value for key,value in r.items() if key not in ['위도','경도','시군구코드','제어방식구분코드']).encode()).hexdigest()[:16]
  if id in seen:continue
  if not r['시설명'] or not address or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['데이터기준일자']):raise SystemExit('Missing source metadata')
  seen.add(id)
  data.append(dict(id=id,name=r['시설명'],region=r['시도명'],district=r['시군구명'],address=address,weekdayStart=r['평일운영시작시각'],weekdayEnd=r['평일운영종료시각'],saturdayStart=r['토요일운영시작시각'],saturdayEnd=r['토요일운영종료시각'],holidayStart=r['공휴일운영시작시각'],holidayEnd=r['공휴일운영종료시각'],freeTime=r['무료이용시간'],lateUnit=r['연체료부과단위시간'],lateFee=r['연체료'],instructions=r['사용방법설명'],typesRaw=r['택배함종류코드'],countsRaw=r['칸개수'],depthRaw=r['칸깊이'],widthRaw=r['칸너비'],heightRaw=r['칸높이'],installedAt=r['설치일자'],customerPhone=r['고객센터전화번호'],organization=r['관리기관명'],phone=r['관리기관전화번호'],dataDate=r['데이터기준일자'],kind='snapshot'))
 if not 1<=len(data)<=500:raise SystemExit('Public row bound changed')
 meta=dict(sourceName='전국안심택배함표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 일부입니다. 같은 시설명·주소라도 조건/기준일이 다른 기록은 별도로 표시합니다. 전국 전체나 현재 빈 칸·고장·개방·수령 가능 상태가 아닙니다.')
 (ROOT/'public/lockers-snapshot.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
