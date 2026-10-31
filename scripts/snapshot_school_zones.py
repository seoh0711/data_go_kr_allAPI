"""공식 시설표 원문만 보존한다. 좌표/개인/아동 정보는 제외한다."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,json,hashlib,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15012891/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html',required=True);a=ap.parse_args();path=Path(a.html);raw=path.read_bytes();p=PublicTables();p.feed(raw.decode());tables=[t for t in p.tables if t['headers'] and {'대상시설명','CCTV설치여부','어린이보호구역지정여부'}.issubset(t['headers'][0])];assert len(tables)==1,'공식 스키마 변경'
 t=tables[0];rows=[];seen=set();mapping={'name':'대상시설명','type':'시설종류','manager':'관리기관명','police':'관할경찰서명','camera':'CCTV설치여부','count':'CCTV설치대수','designation':'어린이보호구역지정여부','changedAt':'어린이보호구역지정여부수정일자','width':'보호구역도로폭','dataDate':'데이터기준일자'}
 for values in t['rows']:
  assert len(values)==len(t['headers'][0]);r=dict(zip(t['headers'][0],values));row={k:r[v] for k,v in mapping.items()};row['address']=r['소재지도로명주소'] or r['소재지지번주소'];parts=row['address'].split();row.update(region=parts[0] if parts else '',district=parts[1] if len(parts)>1 else '원문 확인');assert row['name'] and row['address'] and re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate'])
  row['id']='school-'+hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:rows.append(row);seen.add(row['id'])
 assert 3<=len(rows)<=500
 meta={'sourceName':'전국어린이보호구역표준데이터','sourceUrl':URL,'collectedAt':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),'htmlSha256':hashlib.sha256(raw).hexdigest(),'parsedRows':len(t['rows']),'count':len(rows),'oldestDataDate':min(r['dataDate'] for r in rows),'newestDataDate':max(r['dataDate'] for r in rows),'regions':dict(collections.Counter(r['region'] for r in rows)),'coverage':'공식 공개표 일부499행에서 보존한 시설 기록입니다. 전국 전체/현재 지정 효력·안전성·통학 경로·CCTV 작동 정보가 아닙니다.'}
 (ROOT/'public/school-zones.json').write_text(json.dumps({'metadata':meta,'data':rows},ensure_ascii=False)+'\n');print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
