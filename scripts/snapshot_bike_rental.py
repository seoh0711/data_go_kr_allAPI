"""공식 자전거대여소 시설/문의 원문만 추출한다. 좌표/사용자정보는 제외한다."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,json,hashlib,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15017319/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html',required=True);a=ap.parse_args();path=Path(a.html);raw=path.read_bytes();p=PublicTables();p.feed(raw.decode());ts=[t for t in p.tables if t['headers'] and {'자전거대여소명','자전거보유대수','관리기관전화번호'}.issubset(t['headers'][0])];assert len(ts)==1
 t=ts[0];rows=[];seen=set();mapping={'name':'자전거대여소명','type':'자전거대여소구분','open':'운영시작시각','close':'운영종료시각','closed':'휴무일','feeType':'요금구분','feeText':'자전거이용요금','bikes':'자전거보유대수','racks':'거치대수','pump':'공기주입기비치여부','pumpType':'공기주입기유형','repair':'수리대설치여부','phone':'관리기관전화번호','manager':'관리기관명','dataDate':'데이터기준일자'}
 for vals in t['rows']:
  assert len(vals)==len(t['headers'][0]);r=dict(zip(t['headers'][0],vals));row={k:r[v] for k,v in mapping.items()};row['address']=r['소재지도로명주소'] or r['소재지지번주소'];parts=row['address'].split();row.update(region=parts[0] if parts else '',district=parts[1] if len(parts)>1 else '원문 확인');assert row['name'] and row['address'] and re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate']);row['id']='bike-'+hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:rows.append(row);seen.add(row['id'])
 assert 3<=len(rows)<=500
 meta={'sourceName':'전국자전거대여소표준데이터','sourceUrl':URL,'collectedAt':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),'htmlSha256':hashlib.sha256(raw).hexdigest(),'parsedRows':len(t['rows']),'count':len(rows),'oldestDataDate':min(r['dataDate'] for r in rows),'newestDataDate':max(r['dataDate'] for r in rows),'regions':dict(collections.Counter(r['region'] for r in rows)),'coverage':f'공식 공개표 일부{len(rows)}행에서 보존한 시설 기록입니다. 전국 전체/현재 영업·대여 가능대수·적용요금·예약·개인 자격 정보가 아닙니다.'}
 (ROOT/'public/bike-rental.json').write_text(json.dumps({'metadata':meta,'data':rows},ensure_ascii=False)+'\n');print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
