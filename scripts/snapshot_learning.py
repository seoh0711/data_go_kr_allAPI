"""Bounded public course capture. Discards instructor names and collects no learner data."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15013110/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'강좌명','교육시작일자','수강료','데이터기준일자'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official learning table schema changed; snapshot retained.')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));id='course-'+hashlib.sha256('|'.join(r[k] for k in ['강좌명','교육시작일자','교육시작시각','운영기관명','교육장도로명주소']).encode()).hexdigest()[:16]
  if id in seen:continue
  if not r['강좌명'] or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['데이터기준일자']):raise SystemExit('Missing source metadata')
  seen.add(id);parts=r['교육장도로명주소'].split()
  data.append(dict(id=id,name=r['강좌명'],startDate=r['교육시작일자'],endDate=r['교육종료일자'],startTime=r['교육시작시각'],endTime=r['교육종료시각'],summary=r['강좌내용'],target=r['교육대상구분'],delivery=r['교육방법구분'],days=r['운영요일'],place=r['교육장소'],capacity=r['강좌정원수'],fee=r['수강료'],address=r['교육장도로명주소'],region=parts[0] if parts else '미제공',district=parts[1] if len(parts)>1 else '미제공',organization=r['운영기관명'],phone=r['운영기관전화번호'],applicationStart=r['접수시작일자'],applicationEnd=r['접수종료일자'],applicationMethod=r['접수방법구분'],selection=r['선정방법구분'],website=r['홈페이지주소'],dataDate=r['데이터기준일자'],kind='snapshot'))
 if not 1<=len(data)<=500:raise SystemExit('Public row bound changed')
 meta=dict(sourceName='전국평생학습강좌표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),delivery=dict(collections.Counter(r['delivery'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 일부만 수집. 전국 전체 강좌나 현재 접수 가능/잔여 정원 정보가 아닙니다.')
 (ROOT/'public/learning-courses.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
