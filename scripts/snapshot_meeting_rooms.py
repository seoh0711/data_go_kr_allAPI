"""공식 공개표에서 회의실/강의실 원문만 추출하고 좌표·사진은 제외한다."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,json,hashlib,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15013117/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html',required=True);args=ap.parse_args();path=Path(args.html);raw=path.read_bytes();p=PublicTables();p.feed(raw.decode());tables=[t for t in p.tables if t['headers'] and {'개방시설명','사용기준시간','신청방법구분'}.issubset(t['headers'][0])];assert len(tables)==1,'공식 스키마 변경'
 t=tables[0];data=[];seen=set();selectedRows=0;mapping={'name':'개방시설명','place':'개방장소명','type':'개방시설유형구분','closed':'휴관일','weekdayStart':'평일운영시작시각','weekdayEnd':'평일운영종료시각','weekendStart':'주말운영시작시각','weekendEnd':'주말운영종료시각','feeFlag':'유료사용여부','baseHours':'사용기준시간','feeRaw':'사용료','extraHours':'초과사용단위시간','extraFee':'초과사용료','capacity':'수용가능인원수','amenities':'부대시설정보','method':'신청방법구분','organization':'관리기관명','department':'담당부서명','phone':'사용안내전화번호','dataDate':'데이터기준일자'}
 for v in t['rows']:
  assert len(v)==len(t['headers'][0]),'원문 열 수 변경'
  r=dict(zip(t['headers'][0],v))
  if r['개방시설유형구분'] not in ['회의실','강의실']:continue
  selectedRows+=1;row={k:r[col] for k,col in mapping.items()};row['address']=r['소재지도로명주소'] or r['소재지지번주소'];parts=row['address'].split();row.update(region=parts[0] if parts else '',district=parts[1] if len(parts)>1 else '원문 확인');assert row['name'] and row['address'] and re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate'])
  row['id']='room-'+hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:seen.add(row['id']);data.append(row)
 assert 2<=len(data)<=500
 meta={'sourceUrl':URL,'sourceName':'전국공공시설개방정보표준데이터','parsedRows':len(t['rows']),'selectedRows':selectedRows,'count':len(data),'collectedAt':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),'htmlSha256':hashlib.sha256(raw).hexdigest(),'oldestDataDate':min(r['dataDate'] for r in data),'newestDataDate':max(r['dataDate'] for r in data),'regions':dict(collections.Counter(r['region'] for r in data)),'coverage':'공식 공개표 일부499행 중 유형 원문이 회의실/강의실인 기록만 추출했습니다. 전국 전체·현재 예약/개방·최종 견적 정보가 아닙니다.'}
 (ROOT/'public/meeting-rooms.json').write_text(json.dumps({'metadata':meta,'data':data},ensure_ascii=False)+'\n');print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
