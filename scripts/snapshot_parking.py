"""Capture bounded public parking table rows without authentication or personal data."""
from html.parser import HTMLParser
from pathlib import Path
from datetime import datetime,timezone
import argparse,collections,hashlib,json,urllib.request,urllib.parse,re
ROOT=Path(__file__).resolve().parents[1]
SOURCE='https://www.data.go.kr/data/15012896/standard.do'
PUBLIC_SEARCH='https://www.data.go.kr/tcs/dss/selectStdDataDetailView.do?'+urllib.parse.urlencode({'publicDataPk':'15012896','colCondition':'PRKPLCE_SE','searchKeyword1':'공영'})
class PublicTables(HTMLParser):
    def __init__(self):super().__init__();self.tables=[];self.stack=[];self.row=None;self.cell=None;self.header=False
    def handle_starttag(self,t,attrs):
        if t=='table':self.stack.append({'headers':[],'rows':[]})
        if t=='tr' and self.stack:self.row=[];self.header=False
        if t in ['td','th'] and self.row is not None:self.cell=[];self.header=self.header or t=='th'
    def handle_data(self,v):
        if self.cell is not None:self.cell.append(v)
    def handle_endtag(self,t):
        if t in ['td','th'] and self.cell is not None:self.row.append(' '.join(''.join(self.cell).split()));self.cell=None
        if t=='tr' and self.row is not None and self.stack:self.stack[-1]['headers' if self.header else 'rows'].append(self.row);self.row=None
        if t=='table' and self.stack:self.tables.append(self.stack.pop())
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--html');args=ap.parse_args()
    if args.html:raw=Path(args.html).read_text()
    else:
        with urllib.request.urlopen(urllib.request.Request(PUBLIC_SEARCH,headers={'User-Agent':'Mozilla/5.0'}),timeout=30) as r:raw=r.read().decode()
    parser=PublicTables();parser.feed(raw)
    candidates=[t for t in parser.tables if t['headers'] and {'주차장명','주차장관리번호','요금정보','데이터기준일자'}.issubset(t['headers'][0])]
    if len(candidates)!=1:raise SystemExit('Public parking table schema changed; existing snapshot retained.')
    table=candidates[0];columns=table['headers'][0]
    if not 1<=len(table['rows'])<=500 or any(len(row)!=len(columns) for row in table['rows']):raise SystemExit('Public row bound/schema changed; existing snapshot retained.')
    data=[];seen=set()
    for values in table['rows']:
        r=dict(zip(columns,values));address=r.get('소재지도로명주소') or r.get('소재지지번주소')
        if r.get('주차장구분')!='공영':continue
        if not r.get('주차장명') or not address or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',r.get('데이터기준일자','')):raise SystemExit('Missing public metadata; existing snapshot retained.')
        id='parking-'+hashlib.sha256((r['주차장관리번호']+'|'+r['주차장명']+'|'+address).encode()).hexdigest()[:16]
        if id in seen:continue
        seen.add(id);parts=address.split()
        data.append({'id':id,'name':r['주차장명'],'kind':'snapshot','sourceId':'15012896','sourceUrl':SOURCE,'region':parts[0],'district':parts[1] if len(parts)>1 else '',
            'category':r['주차장구분'],'type':r.get('주차장유형',''),'address':address,'capacity':r.get('주차구획수',''),'operatingDays':r.get('운영요일',''),
            'weekday':[r.get('평일운영시작시각',''),r.get('평일운영종료시각','')],'saturday':[r.get('토요일운영시작시각',''),r.get('토요일운영종료시각','')],'holiday':[r.get('공휴일운영시작시각',''),r.get('공휴일운영종료시각','')],
            'feeType':r.get('요금정보',''),'baseMinutes':r.get('주차기본시간',''),'baseFee':r.get('주차기본요금',''),'extraMinutes':r.get('추가단위시간',''),'extraFee':r.get('추가단위요금',''),'dailyApplyTime':r.get('1일주차권요금적용시간',''),'dailyFee':r.get('1일주차권요금',''),'monthlyFee':r.get('월정기권요금',''),
            'payment':r.get('결제방법',''),'notes':r.get('특기사항',''),'phone':r.get('전화번호',''),'organization':r.get('관리기관명',''),'dataDate':r['데이터기준일자'],'remaining':None,'observedAt':None})
    if not data:raise SystemExit('No public parking facilities; existing snapshot retained.')
    metadata={'sourceName':'전국주차장정보표준데이터 공개표','sourceUrl':SOURCE,'publicQueryUrl':PUBLIC_SEARCH,'collectedAt':datetime.now(timezone.utc).isoformat(),'count':len(data),'parsedRows':len(table['rows']),'regions':dict(collections.Counter(d['region'] for d in data)),'fees':dict(collections.Counter(d['feeType'] for d in data)),'oldestDataDate':min(d['dataDate'] for d in data),'newestDataDate':max(d['dataDate'] for d in data),'coverage':'공식 공개표 일부 중 공영으로 표기된 시설만 포함. 전국 전체 공영주차장 목록이 아닙니다.','htmlSha256':hashlib.sha256(raw.encode()).hexdigest()}
    target=ROOT/'public/parking-snapshot.json';tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps({'metadata':metadata,'data':data},ensure_ascii=False));tmp.replace(target)
    print(json.dumps({k:metadata[k] for k in ['count','parsedRows','regions','fees','oldestDataDate','newestDataDate']},ensure_ascii=False))
if __name__=='__main__':main()
