export const bagSourceUrl='https://www.data.go.kr/data/15025538/standard.do';
export const recyclingSources=[
 {key:'items',id:'15156866',name:'기후에너지환경부_분리배출 정보조회 서비스',secret:'RECYCLING_ITEMS_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/1482000/WasteRecyclingService/getItem'},
 {key:'centers',id:'15109194',name:'제주특별자치도 제주시_재활용도움센터 조회 서비스',secret:'RECYCLING_CENTERS_KEY',auth:'data-go-kr',endpoint:'https://apis.data.go.kr/6510000/recycleCenterService/getRecycleCenterList'},
];
export const recyclingSourceUrl=id=>`https://www.data.go.kr/data/${id}/openapi.do`;
export const itemChoices=['생수병','우유팩','캔','종이상자','스티로폼','비닐'];
export const initialBagFilters={query:'',region:'전체',district:'전체',usage:'전체',target:'전체',volume:'20ℓ'};
export const bagVolumes=['1ℓ','1.5ℓ','2ℓ','2.5ℓ','3ℓ','5ℓ','10ℓ','20ℓ','30ℓ','50ℓ','60ℓ','75ℓ','100ℓ','120ℓ','125ℓ'];
