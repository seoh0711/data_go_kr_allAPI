"""Build a bounded, keyless library snapshot from the portal's public HTML table.
No cookies, authentication, API keys, personal positions or contact identities.
"""
from html.parser import HTMLParser
from pathlib import Path
from datetime import datetime, timezone
import argparse,collections,hashlib,json,urllib.request,re
URL='https://www.data.go.kr/data/15013109/standard.do'
ROOT=Path(__file__).resolve().parents[1]
class PublicRows(HTMLParser):
    def __init__(self):super().__init__();self.rows=[];self.row=None;self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr' and 'contentsTr' in dict(attrs).get('class','').split():self.row=[]
        if tag=='td' and self.row is not None:self.cell=[]
    def handle_data(self,value):
        if self.cell is not None:self.cell.append(value)
    def handle_endtag(self,tag):
        if tag=='td' and self.cell is not None:self.row.append(' '.join(''.join(self.cell).split()));self.cell=None
        if tag=='tr' and self.row is not None:self.rows.append(self.row);self.row=None

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--html',help='Existing public HTML capture (no new request)');args=ap.parse_args()
    if args.html:raw=Path(args.html).read_text()
    else:
        with urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=30) as r:raw=r.read().decode('utf-8')
    parser=PublicRows();parser.feed(raw)
    if not 1<=len(parser.rows)<=500 or any(len(r)!=26 for r in parser.rows):raise SystemExit('Public table schema or bounded row count changed; existing snapshot retained.')
    data=[];seen=set()
    for r in parser.rows:
        if not all([r[0],r[1],r[17]]) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r[25]):raise SystemExit('Required public facility metadata missing; existing snapshot retained.')
        id='library-'+hashlib.sha256((r[0]+'|'+r[17]).encode()).hexdigest()[:16]
        if id in seen:continue
        seen.add(id)
        data.append({'id':id,'name':r[0],'region':r[1],'district':r[2],'type':r[3],'closed':r[4],'weekday':[r[5],r[6]],'saturday':[r[7],r[8]],'holiday':[r[9],r[10]],'address':r[17],'phone':r[19],'website':r[22],'dataDate':r[25],'kind':'snapshot','sourceId':'15013109','sourceUrl':URL,'fee':None})
    metadata={'sourceName':'전국도서관표준데이터 공개표','sourceUrl':URL,'collectedAt':datetime.now(timezone.utc).isoformat(),'count':len(data),'regionCounts':dict(collections.Counter(d['region'] for d in data)),'oldestDataDate':min(d['dataDate'] for d in data),'newestDataDate':max(d['dataDate'] for d in data),'coverage':'공식 상세 페이지에 공개된 일부 표만 수집. 전국 전체 도서관 목록이 아닙니다.','license':'공식 포털의 이용허락범위를 확인하세요.','htmlSha256':hashlib.sha256(raw.encode()).hexdigest()}
    target=ROOT/'public/culture-libraries.json';tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps({'metadata':metadata,'data':data},ensure_ascii=False));tmp.replace(target)
    print(json.dumps({'count':len(data),'regions':len(metadata['regionCounts']),'dataDateRange':[metadata['oldestDataDate'],metadata['newestDataDate']]},ensure_ascii=False))
if __name__=='__main__':main()
