import {cities,sources} from '../commute/config.js';
export const parkSourceUrl='https://www.data.go.kr/data/15012890/standard.do';
export const parkCities=cities;
export const parkSources=sources.filter(s=>['weather','air'].includes(s.key));
export const initialParkFilters={query:'',region:'전체',district:'전체',type:'전체',facility:'전체'};
export const parkFacilities={전체:null,운동시설:'sports',유희시설:'play',편익시설:'convenience',교양시설:'culture',기타시설:'other'};
