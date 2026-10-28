export const librarySource={id:'15013109',name:'전국도서관표준데이터',url:'https://www.data.go.kr/data/15013109/standard.do'};
export const cultureSources=[
 {key:'places',id:'15138930',name:'문화시설',officialName:'한국문화정보원_문화시설조회서비스',secret:'CULTURE_PLACES_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/B553457/nopenapi/rest/cultureartspaces/library'},
 {key:'events',id:'15138937',name:'문화행사',officialName:'한국문화정보원_한눈에보는문화정보조회서비스',secret:'CULTURE_EVENTS_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/B553457/cultureinfo/period2'},
];
export const initialCultureFilters={query:'',region:'전체',type:'전체',schedule:'all',savedOnly:false};
export const libraryTypes=['전체','공공도서관','작은도서관','어린이도서관','전문도서관'];
export const schedules=[{value:'all',label:'모든 시간표'},{value:'evening',label:'평일 18시 이후 종료'},{value:'saturday',label:'토요일 시간 등록'}];
export const cultureSourceUrl=id=>`https://www.data.go.kr/data/${id}/openapi.do`;
