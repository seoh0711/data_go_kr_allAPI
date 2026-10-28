export const parkingPublicSource={id:'15012896',name:'전국주차장정보표준데이터',url:'https://www.data.go.kr/data/15012896/standard.do'};
export const parkingSources=[
 {key:'busan',id:'15004683',name:'부산 공영주차장 안내',officialName:'부산광역시_공영주차장 정보 조회',secret:'PARKING_BUSAN_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/6260000/BusanPblcPrkngInfoService/getPblcPrkngInfo'},
 {key:'availability',id:'15157490',name:'부산시설공단 주차정보',officialName:'부산시설공단_공영주차장 시설 현황 조회 서비스',secret:'PARKING_AVAILABILITY_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/B552587/ParkingInfoService_v2/getParkingInfoList_v2'},
];
export const parkingSourceUrl=id=>`https://www.data.go.kr/data/${id}/openapi.do`;
export const initialParkingFilters={query:'',region:'전체',type:'전체',fee:'전체',savedOnly:false};
export const parkingTypes=['전체','노상','노외','부설'];
export const parkingFees=['전체','무료','유료','혼합','미제공'];
