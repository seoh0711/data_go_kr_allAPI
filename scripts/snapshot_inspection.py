"""공식 검사소 공개표의 기관 정보/표시 항목만 보존한다. 좌표·면적·인력은 제외한다."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,json,hashlib,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15021107/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html',required=True);a=ap.parse_args();path=Path(a.html);raw=path.read_bytes();p=PublicTables();p.feed(raw.decode());tables=[t for t in p.tables if t['headers'] and {'자동차검사소명','정기검사여부','검사소전화번호'}.issubset(t['headers'][0])];assert len(tables)==1,'공식 스키마 변경'
 t=tables[0];rows=[];seen=set();mapping={'name':'자동차검사소명','type':'자동차검사소유형','phone':'검사소전화번호','hours':'운영시간','newInspection':'신규검사여부','regular':'정기검사여부','tuning':'튜닝검사여부','temporary':'임시검사여부','repair':'수리검사여부','emissions':'배출가스정밀검사여부','meter':'택시미터검정여부','manager':'관리기관명','managerPhone':'관리기관전화번호','dataDate':'데이터기준일자'}
 for values in t['rows']:
  assert len(values)==len(t['headers'][0]),'원문 열수 변경';r=dict(zip(t['headers'][0],values));row={k:r[v] for k,v in mapping.items()};row['address']=r['소재지도로명주소'] or r['소재지지번주소'];parts=row['address'].split();row.update(region=parts[0] if parts else '',district=parts[1] if len(parts)>1 else '원문 확인');assert row['name'] and row['address'] and re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate'])
  row['id']='inspection-'+hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:rows.append(row);seen.add(row['id'])
 assert 3<=len(rows)<=500 and all(r['type']=='민간' for r in rows),'이번 서비스의 민간 표본 범위 변경'
 meta={'sourceName':'전국자동차검사소표준데이터','sourceUrl':URL,'collectedAt':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),'htmlSha256':hashlib.sha256(raw).hexdigest(),'parsedRows':len(t['rows']),'count':len(rows),'oldestDataDate':min(r['dataDate'] for r in rows),'newestDataDate':max(r['dataDate'] for r in rows),'regions':dict(collections.Counter(r['region'] for r in rows)),'types':dict(collections.Counter(r['type'] for r in rows)),'coverage':'공식 공개표 일부499행에서 보존한 기록입니다. 이번 표본의 유형은 모두민간입니다. 전국 전체/현재 접수·차량 적합성·검사의무 정보가 아닙니다.'}
 (ROOT/'public/inspection-stations.json').write_text(json.dumps({'metadata':meta,'data':rows},ensure_ascii=False)+'\n');print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
