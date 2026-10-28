export const benefitSources = [
  {key:'gov24',id:'15113968',name:'정부 공공서비스',officialName:'행정안전부_대한민국 공공서비스(혜택) 정보',organization:'행정안전부',secret:'BENEFITS_GOV24_KEY',auth:'data-go-kr',endpoint:'https://api.odcloud.kr/api/gov24/v3/serviceList',format:'JSON',limit:100,approval:'개발·운영 자동승인 · 활용 신청 필요'},
  {key:'central',id:'15090532',name:'중앙부처 복지',officialName:'한국사회보장정보원_중앙부처복지서비스',organization:'한국사회보장정보원',secret:'BENEFITS_CENTRAL_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001',format:'XML',limit:100,approval:'개발·운영 자동승인 · 활용 신청 필요'},
  {key:'local',id:'15108347',name:'지자체 복지',officialName:'한국사회보장정보원_지자체복지서비스',organization:'한국사회보장정보원',secret:'BENEFITS_LOCAL_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist',format:'XML',limit:100,approval:'개발·운영 자동승인 · 활용 신청 필요'},
];
export const regions=['전체','서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도'];
export const ages=['전체','청년','중장년','노년'];
export const topics=['전체','생활','일자리','교육','주거'];
export const initialFilters={query:'',region:'전체',age:'전체',topic:'전체',savedOnly:false};
export function sourceUrl(id){return `https://www.data.go.kr/data/${id}/openapi.do`}
