"""공식 마을/프로그램 공개 원문만 보존한다. 대표자·전화·좌표·사진은 제외한다."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,json,hashlib,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15013113/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html',required=True);a=ap.parse_args();path=Path(a.html);raw=path.read_bytes();p=PublicTables();p.feed(raw.decode());tables=[t for t in p.tables if t['headers'] and {'체험마을명','체험프로그램명','보유시설정보'}.issubset(t['headers'][0])];assert len(tables)==1
 t=tables[0];rows=[];seen=set();mapping={'name':'체험마을명','region':'시도명','district':'시군구명','type':'체험프로그램구분','program':'체험프로그램명','facilities':'보유시설정보','manager':'관리기관명','dataDate':'데이터기준일자'}
 for values in t['rows']:
  assert len(values)==len(t['headers'][0]);r=dict(zip(t['headers'][0],values));row={k:r[v] for k,v in mapping.items()};row['address']=r['소재지도로명주소'] or r['소재지지번주소'];assert row['name'] and row['address'] and re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['dataDate']);row['id']='village-'+hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:rows.append(row);seen.add(row['id'])
 assert 3<=len(rows)<=500
 meta={'sourceName':'전국농어촌체험휴양마을표준데이터','sourceUrl':URL,'collectedAt':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),'htmlSha256':hashlib.sha256(raw).hexdigest(),'parsedRows':len(t['rows']),'count':len(rows),'oldestDataDate':min(r['dataDate'] for r in rows),'newestDataDate':max(r['dataDate'] for r in rows),'regions':dict(collections.Counter(r['region'] for r in rows)),'coverage':f'공식 공개표 일부{len(rows)}행에서 보존한 마을 기록입니다. 전국 전체/현재 프로그램 운영·시설/예약 가능·가격·개인 자격 정보가 아닙니다.'}
 (ROOT/'public/villages.json').write_text(json.dumps({'metadata':meta,'data':rows},ensure_ascii=False)+'\n');print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
