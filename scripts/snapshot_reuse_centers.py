"""공개 센터 정보만 수집하며 대표자명과 좌표는 제외한다."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15021108/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args();raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0','Accept':'text/html'}),timeout=25).read().decode();p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'재활용센터명','주요취급품목정보','휴무일정보'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('공식 센터 스키마 변경: 기존 스냅샷 유지')
 t=tables[0];data=[];seen=set();fields={'name':'재활용센터명','operation':'재활용센터운영구분','items':'주요취급품목정보','organization':'운영기관명','phone':'운영기관전화번호','weekdayStart':'평일운영시작시각','weekdayEnd':'평일운영종료시각','holidayStart':'공휴일운영시작시각','holidayEnd':'공휴일운영종료시각','closed':'휴무일정보','afterService':'애프터서비스정보','managerPhone':'관리기관전화번호','manager':'관리기관명','dataDate':'데이터기준일자'}
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('원문 열 수 변경')
  r=dict(zip(t['headers'][0],v));row={k:r[col] for k,col in fields.items()};row['address']=r['소재지도로명주소'] or r['소재지지번주소'];parts=row['address'].split();row.update(region=parts[0] if parts else '',district=parts[1] if len(parts)>1 else '원문 확인')
  if not row['name'] or not row['address'] or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate']):raise SystemExit('필수 출처 정보 누락')
  row['id']='reuse-'+hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:seen.add(row['id']);data.append(row)
 if not 1<=len(data)<=500:raise SystemExit('공개 행 수 범위 변경')
 meta=dict(sourceName='전국재활용센터표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage=f'공식 공개표 {len(t["rows"])}행에서 보존한 {len(data)}기록입니다. 전국 전체·현재 취급/수거/판매/매입 가능 정보가 아닙니다.')
 (ROOT/'public/reuse-centers.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
