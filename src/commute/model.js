export function departure(arrival,travel,walk,buffer){
 const [h,m]=arrival.split(':').map(Number);const total=h*60+m-Number(travel)-Number(walk)-Number(buffer);
 return {time:String(Math.floor(((total%1440)+1440)%1440/60)).padStart(2,'0')+':'+String(((total%60)+60)%60).padStart(2,'0'),previousDay:total<0};
}
export function advice(weather,air){
 const a=[];
 if(weather?.precipitation>0||weather?.rain>0)a.push('비·눈이 관측됐어요. 우산을 챙기고 이동 여유를 더 잡으세요.');
 if(air?.pm25>35)a.push('초미세먼지가 나쁨 수준이에요. 야외 대기 시간을 줄이세요.');
 if(weather?.temperature!==null&&weather?.temperature<5)a.push('기온이 낮아요. 따뜻한 겉옷을 준비하세요.');
 return a;
}
