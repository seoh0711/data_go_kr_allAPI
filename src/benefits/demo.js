// Deliberately fictional programs: no amounts, application promises or links.
export const demoBenefits=[
  {id:'demo-youth',title:'청년의 첫걸음 지원 (가상)',organization:'체험용 가상기관',summary:'지역과 관심 주제로 안내를 좁혀 보는 예시입니다. 실제 사업이나 신청 가능한 혜택이 아닙니다.',regions:['서울특별시'],ages:['청년'],topic:'일자리'},
  {id:'demo-learning',title:'배움을 이어가는 교실 (가상)',organization:'체험용 가상기관',summary:'교육 분야 탐색과 관심목록 기능을 체험할 수 있어요. 실제 지원 내용은 연결된 공식 안내에서 확인해야 합니다.',regions:['전국'],ages:[],topic:'교육'},
  {id:'demo-home',title:'우리 동네 주거 안내 (가상)',organization:'체험용 가상기관',summary:'경기도 주거 분야의 가상 안내입니다. 지원금이나 신청 기한을 의미하지 않습니다.',regions:['경기도'],ages:[],topic:'주거'},
  {id:'demo-work',title:'다시 시작하는 일자리 (가상)',organization:'체험용 가상기관',summary:'관심 연령대에 따른 필터 작동을 보여주는 예시입니다. 수급 자격을 판정하지 않습니다.',regions:['전국'],ages:['중장년'],topic:'일자리'},
  {id:'demo-life',title:'생활의 작은 도움 (가상)',organization:'체험용 가상기관',summary:'부산 지역 생활 안내의 체험용 예시입니다. 실제 운영 중인 제도가 아닙니다.',regions:['부산광역시'],ages:['노년'],topic:'생활'},
].map(row=>({...row,kind:'demo',url:null,updatedAt:'가상 데이터',sourceKey:'demo'}));
