"""이미 확보한 카탈로그에서 기존 연결7개의 메타데이터만 추출한다."""
import json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
raw=(root/'public/catalog.json').read_bytes();p=json.loads(raw)
ids=['15113968','15090532','15108347','15004683','15157490','15138930','15138937'];index={r['id']:r for r in p['data']}
assert len(p['data'])==12051 and all(i in index for i in ids)
rows=[index[i] for i in ids]
out={'metadata':{'count':len(rows),'catalogCount':12051,'catalogCollectedAt':p['metadata']['collectedAt'],'catalogSha256':hashlib.sha256(raw).hexdigest(),'scope':'기존 혜택·주차·문화 연결7개의 목록 메타데이터입니다. 전체 API·최신 공식 명세·활용승인 상태가 아닙니다.'},'data':rows}
(root/'public/api-planner.json').write_text(json.dumps(out,ensure_ascii=False)+'\n')
print('기존 카탈로그7개 메타데이터 추출')
