export const categories = [
  ['교통물류','교통과 이동','TrainFront','#dce9fc'], ['공공행정','행정과 정책','Landmark','#e5e2fa'],
  ['보건의료','건강한 일상','HeartPulse','#fbdedc'], ['문화관광','문화와 여행','Compass','#f9e7c8'],
  ['환경기상','환경과 날씨','CloudSun','#dceee2'], ['국토관리','공간과 도시','Map','#dfe7ef'],
  ['산업고용','산업과 일자리','BriefcaseBusiness','#e4e7fd'], ['사회복지','함께하는 사회','HandHeart','#f6dfea'],
  ['교육','배움과 성장','GraduationCap','#e6eecf'], ['농축수산','농업과 먹거리','Sprout','#e0edde'],
  ['재정금융','경제와 금융','ChartNoAxesCombined','#f9eacb'], ['재난안전','안전한 생활','ShieldCheck','#f5dfd8'],
  ['과학기술','기술과 혁신','FlaskConical','#dcebf0'], ['식품건강','식품과 영양','Apple','#f0e9d7'],
  ['통일외교안보','국제사회와 안보','Globe','#e3e5ef'], ['법률','법과 권리','Scale','#e9e3dc'],
].map(([name,subtitle,icon,color],i)=>({id:String(i),name,subtitle,icon,color}));
const examples = [
 ['교통물류','전국 버스 정류장 정보','국토교통부','정류장 위치와 노선 정보를 활용해 더 편리한 이동 서비스를 구상해 보세요.',['버스','정류장','대중교통']],
 ['교통물류','실시간 도시철도 도착 정보','서울특별시','도시철도 도착 정보로 출퇴근길을 돕는 서비스를 구상해 보세요.',['지하철','실시간','서울']],
 ['교통물류','전국 공영주차장 정보','지방자치단체','주차장 위치, 운영시간, 이용요금 정보를 탐색하는 예시입니다.',['주차장','위치','자동차']],
 ['교통물류','전기차 충전소 위치 정보','한국환경공단','전기차 충전소의 위치와 충전기 정보를 연결하는 예시입니다.',['전기차','충전소','친환경']],
 ['공공행정','전국 공공기관 현황','행정안전부','공공기관 위치와 기본 정보를 한곳에서 탐색하는 예시입니다.',['공공기관','행정','위치']],
 ['공공행정','주민등록 인구통계','행정안전부','지역별 인구 분포와 변화를 이해하기 위한 데이터 예시입니다.',['인구','통계','지역']],
 ['공공행정','공공시설 개방 정보','지방자치단체','우리 동네에서 이용할 수 있는 공공시설을 발견해 보세요.',['공공시설','생활','지역']],
 ['보건의료','전국 병원·약국 찾기','건강보험심사평가원','의료기관의 위치와 진료과목을 탐색하는 서비스 예시입니다.',['병원','약국','의료']],
 ['보건의료','응급의료기관 정보','국립중앙의료원','가까운 응급의료기관 정보를 연결하는 서비스 예시입니다.',['응급실','의료기관','건강']],
 ['보건의료','지역별 건강검진 통계','국민건강보험공단','건강검진 통계로 지역의 건강 현황을 살펴보는 예시입니다.',['건강검진','통계']],
 ['문화관광','한국 관광지 정보','한국관광공사','여행지, 문화시설, 축제 정보를 활용하는 여행 서비스 예시입니다.',['여행','관광지','축제']],
 ['문화관광','전국 문화행사 정보','지방자치단체','지역의 전시와 공연, 문화행사를 발견하는 예시입니다.',['공연','전시','문화']],
 ['문화관광','공공도서관 도서 정보','국립중앙도서관','도서관과 도서 데이터를 연결하는 탐색 서비스 예시입니다.',['도서관','도서','독서']],
 ['환경기상','단기 기상예보 정보','기상청','지역별 날씨 예보를 활용하는 생활 서비스 예시입니다.',['날씨','기온','예보']],
 ['환경기상','대기오염 측정 정보','한국환경공단','측정소별 대기질 정보를 탐색하는 환경 서비스 예시입니다.',['미세먼지','대기질','환경']],
 ['환경기상','전국 하천 수질 정보','환경부','지역별 수질 측정 정보를 시각화하는 예시입니다.',['수질','하천','측정']],
 ['국토관리','건축물 기본 정보','국토교통부','건축물의 기본 현황과 공간 정보를 탐색하는 예시입니다.',['건축물','공간','부동산']],
 ['국토관리','아파트 매매 실거래 정보','국토교통부','지역별 아파트 거래 흐름을 살펴보는 예시입니다.',['아파트','실거래','주택']],
 ['산업고용','지역별 채용 정보','한국고용정보원','채용 정보를 연결해 일자리를 탐색하는 예시입니다.',['채용','일자리','고용']],
 ['산업고용','소상공인 상가 정보','소상공인시장진흥공단','지역 상권과 업종 분포를 이해하는 예시입니다.',['상권','소상공인','매장']],
 ['사회복지','지역별 복지서비스 정보','보건복지부','나에게 필요한 복지서비스를 찾는 탐색 예시입니다.',['복지','지원','생활']],
 ['사회복지','전국 어린이집 정보','보건복지부','어린이집 위치와 운영 현황을 살펴보는 예시입니다.',['어린이집','보육']],
 ['교육','전국 학교 기본 정보','교육부','학교 위치와 기본 현황을 탐색하는 예시입니다.',['학교','교육','학생']],
 ['농축수산','농산물 도매가격 정보','한국농수산식품유통공사','농산물의 가격 흐름을 살펴보는 데이터 예시입니다.',['농산물','가격','시장']],
 ['재정금융','지역별 재정 현황','행정안전부','지역 예산과 재정 통계를 시각화하는 예시입니다.',['예산','재정','통계']],
 ['재난안전','재난문자 정보','행정안전부','지역의 재난안전 소식을 탐색하는 예시입니다.',['재난','안전','문자']],
 ['과학기술','국가 연구개발 과제 정보','과학기술정보통신부','연구개발 과제를 탐색하고 기술 동향을 살펴보는 예시입니다.',['연구','기술','과제']],
 ['식품건강','식품 영양성분 정보','식품의약품안전처','식품별 영양성분을 비교하는 서비스 예시입니다.',['영양','식품','건강']],
 ['통일외교안보','국가별 해외안전 정보','외교부','해외여행에 필요한 안전 정보를 탐색하는 예시입니다.',['해외','여행','안전']],
 ['법률','생활법령 정보','법제처','일상과 관련된 법률 정보를 탐색하는 예시입니다.',['법령','법률','생활']],
];
export const sampleData = examples.map(([category,title,organization,description,tags],i)=>({id:`sample-${i+1}`,category,title,organization,description,tags,format:i%4===0?'XML':'JSON',url:`https://www.data.go.kr/tcs/dss/selectDataSetList.do?dType=API&keyword=${encodeURIComponent(title)}`}));
export function filterData(data,{query='',category='전체',bookmarks=null,format='전체',sort='default'}={}) {
 const q=query.trim().toLocaleLowerCase();
 const result=data.filter(d=>(category==='전체'||d.category===category)&&(!bookmarks||bookmarks.includes(d.id))&&(format==='전체'||d.format===format)&&(!q||[d.title,d.organization,d.description,...d.tags].join(' ').toLocaleLowerCase().includes(q)));
 return sort==='name'?result.sort((a,b)=>a.title.localeCompare(b.title,'ko')):result;
}
export function validateCatalog(input) {
 if(!Array.isArray(input)||!input.length||input.length>100000) throw new Error('1~100,000개 항목이 담긴 JSON 배열을 선택해 주세요.');
 const ids=new Set();
 return input.map((d,i)=>{
  if(!d||typeof d!=='object'||!['id','title','category','organization','description','format','url'].every(k=>typeof d[k]==='string'&&d[k].trim())) throw new Error(`${i+1}번째 항목의 필수 필드를 확인해 주세요.`);
  if(ids.has(d.id)) throw new Error(`중복 ID가 있습니다: ${d.id}`);
  ids.add(d.id);
  if(!categories.some(c=>c.name===d.category)) throw new Error(`${i+1}번째 항목의 카테고리를 확인해 주세요.`);
  const u=new URL(d.url);
  if(u.protocol!=='https:'||!['data.go.kr','www.data.go.kr'].includes(u.hostname)) throw new Error('출처 URL은 https://www.data.go.kr 주소여야 합니다.');
  if(!['JSON','XML','CSV','기타'].includes(d.format)||!Array.isArray(d.tags)||!d.tags.every(t=>typeof t==='string')) throw new Error(`${i+1}번째 항목의 format 또는 tags를 확인해 주세요.`);
  return {id:d.id,title:d.title,category:d.category,organization:d.organization,description:d.description,format:d.format,url:d.url,tags:d.tags};
 });
}
