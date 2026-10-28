"""Capture bounded official tourist information desk rows, without user data."""
from snapshot_parking import PublicTables
from pathlib import Path
from datetime import datetime,timezone
import argparse,urllib.request,hashlib,json,collections,re
ROOT=Path(__file__).resolve().parents[1];URL='https://www.data.go.kr/data/15013112/standard.do'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--html');a=ap.parse_args()
 raw=Path(a.html).read_text() if a.html else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
 p=PublicTables();p.feed(raw);tables=[t for t in p.tables if t['headers'] and {'관광안내소명','영어안내가능여부','운영시작시각(하절기)','데이터기준일자'}.issubset(t['headers'][0])]
 if len(tables)!=1:raise SystemExit('Official desk table schema changed; snapshot retained.')
 t=tables[0];data=[];seen=set()
 for v in t['rows']:
  if len(v)!=len(t['headers'][0]):raise SystemExit('Column count changed')
  r=dict(zip(t['headers'][0],v));address=r['소재지도로명주소'] or r['소재지지번주소'];id='desk-'+hashlib.sha256((r['관광안내소명']+'|'+address+'|'+r['안내소위치명']).encode()).hexdigest()[:16]
  if id in seen:continue
  if not r['관광안내소명'] or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r['데이터기준일자']):raise SystemExit('Missing source metadata')
  seen.add(id)
  data.append(dict(id=id,name=r['관광안내소명'],location=r['안내소위치명'],region=r['시도명'],district=r['시군구명'],summary=r['안내소소개'],services=r['부가서비스정보'],closed=r['휴무일'],summerStart=r['운영시작시각(하절기)'],summerEnd=r['운영종료시각(하절기)'],winterStart=r['운영시작시각(동절기)'],winterEnd=r['운영종료시각(동절기)'],english=r['영어안내가능여부'],japanese=r['일본어안내가능여부'],chinese=r['중국어안내가능여부'],otherLanguages=r['안내가능외국어'],phone=r['안내소전화번호'],address=address,organization=r['운영기관명'],website=r['홈페이지주소'],dataDate=r['데이터기준일자'],kind='snapshot'))
 if not 1<=len(data)<=500:raise SystemExit('Public row bound changed')
 meta=dict(sourceName='전국관광안내소표준데이터',sourceUrl=URL,collectedAt=datetime.now(timezone.utc).isoformat(),count=len(data),parsedRows=len(t['rows']),oldestDataDate=min(r['dataDate'] for r in data),newestDataDate=max(r['dataDate'] for r in data),regions=dict(collections.Counter(r['region'] for r in data)),htmlSha256=hashlib.sha256(raw.encode()).hexdigest(),coverage='공식 공개표 일부만 수집. 전국 전체 안내소나 현재 직원 근무·외국어 안내 가능/개방 상태가 아닙니다.')
 (ROOT/'public/travel-help-desks.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False));print(json.dumps(meta,ensure_ascii=False))
if __name__=='__main__':main()
