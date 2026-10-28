"""Capture public facility metadata only; no personal or device data."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15034533/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'시설명','공기주입가능여부','휴대전화충전가능여부','데이터기준일자'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official facility schema changed; snapshot retained')
 t=tables[0];data=[];seen=set()
 fields={'name':'시설명','region':'시도명','district':'시군구명','position':'설치장소설명','weekdayStart':'평일운영시작시각','weekdayEnd':'평일운영종료시각','saturdayStart':'토요일운영시작시각','saturdayEnd':'토요일운영종료시각','holidayStart':'공휴일운영시작시각','holidayEnd':'공휴일운영종료시각','capacity':'동시사용가능대수','air':'공기주입가능여부','phoneCharge':'휴대전화충전가능여부','organization':'관리기관명','phone':'관리기관전화번호','dataDate':'데이터기준일자'}
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));row={k:r[col] for k,col in fields.items()};row['address']=r['소재지도로명주소'] or r['소재지지번주소'];row['id']='power-'+hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] in seen:continue
  if not row['name'] or not row['address'] or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate']):raise SystemExit('Missing source metadata')
  seen.add(row['id']);data.append(row)
 if not 1<=len(data)<=500:raise SystemExit('Public row bound changed')
 meta=dict(sourceName='전국전동휠체어급속충전기표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 일부499행에서 수집했습니다. 조건·기준일이 다른 기록은 보존합니다. 전국 전체나 실시간 작동·빈 자리·현재 개방 정보가 아닙니다.')
 (ROOT/'public/mobility-power-snapshot.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
