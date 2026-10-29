"""Package whitelisted facility facts verified in an official public page excerpt."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,json,hashlib,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15021138/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--verified-rows',required=True);a=ap.parse_args();raw=json.loads(Path(a.verified_rows).read_text());rows=raw['data'] if isinstance(raw,dict) else raw;data=[]
 fields=['name','type','address','organization','phone','managerPhone','manager','dataDate'];seen=set()
 for r in rows:
  if not all(isinstance(r.get(k),str) for k in fields) or not r['name'] or not r['address'] or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['dataDate']):raise SystemExit('Missing verified public fields')
  row={k:r[k] for k in fields};parts=row['address'].split();row.update(region=parts[0],district=parts[1] if len(parts)>1 else '원문 확인',sourceLine=r['sourceLine']);row['id']='care-'+hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16];row['kind']='snapshot'
  if row['id'] not in seen:seen.add(row['id']);data.append(row)
 if not 1<=len(data)<=100:raise SystemExit('Verified excerpt bound changed')
 meta=dict(sourceName='전국치매센터표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),sourceMethod='공식 페이지의 공개 웹 읽기 텍스트에서 확인한 일부 행. 직접 HTML 수집은503으로 실패했으며 전체 자료를 수집하지 않았습니다.',sourceLines=[min(r['sourceLine'] for r in data),max(r['sourceLine'] for r in data)],retainedFactsSha256=hashlib.sha256(json.dumps(data,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),coverage='공식 페이지 일부16기록만 확인한 고정 스냅샷입니다. 전국 전체·현재 운영·예약 가능·이용 대상 정보가 아닙니다.')
 (ROOT/'public/care-centers.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
