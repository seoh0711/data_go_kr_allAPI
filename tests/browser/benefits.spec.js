import {test,expect} from '@playwright/test';
const keys=['gov24','central','local'];
const unavailable=()=>({checkedAt:new Date().toISOString(),sources:keys.map(key=>({key,status:'needs_key',data:[]}))});
test.beforeEach(async({page})=>{await page.route('**/api/benefits',route=>route.fulfill({json:unavailable()}))});
test('atlas entry, public guide source, filters, bookmarks, details and reset',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('.benefits-promo').click();await expect(page).toHaveURL(/\/services\/benefits\//);await expect(page.locator('.bm-card')).toHaveCount(8);await expect(page.locator('.bm-mode-note')).toContainText('공개');
 await page.getByLabel('관심 지역',{exact:true}).selectOption('경기도');await expect(page.locator('.bm-card')).toHaveCount(6);await page.getByLabel('관심 연령대',{exact:true}).selectOption('청년');await expect(page.locator('.bm-card')).toHaveCount(5);
 await page.getByRole('textbox',{name:'안내 검색'}).fill('국민내일배움');await expect(page.locator('.bm-card')).toHaveCount(1);await page.locator('.bm-card-top button').click();await page.getByRole('button',{name:/관심목록만 보기/}).click();await expect(page.locator('.bm-card')).toHaveCount(1);
 await page.locator('.bm-card-body').click();await expect(page.locator('.bm-dialog')).toBeVisible();await expect(page.locator('.bm-detail-caution')).toContainText('개별 지원 제도');await expect(page.locator('.bm-dialog-actions a')).toHaveAttribute('href','https://www.data.go.kr/data/15109032/openapi.do');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'초기화',exact:true}).click();await expect(page.locator('.bm-card')).toHaveCount(8);await expect(page.getByRole('textbox',{name:'안내 검색'})).toHaveValue('');await expect(page.getByLabel('관심 지역',{exact:true})).toHaveValue('전체');expect(errors).toEqual([]);
});
test('unconnected data and fictional examples remain separate',async({page})=>{
 await page.goto('/services/benefits/');await page.getByRole('button',{name:'연결된 제도',exact:true}).click();await expect(page.locator('.bm-live-status')).toContainText('0 / 3');await expect(page.locator('.bm-card')).toHaveCount(0);await expect(page.locator('.bm-empty')).toContainText('연결을 기다리고');
 await page.getByRole('button',{name:'예시 체험',exact:true}).first().click();await expect(page.locator('.bm-card')).toHaveCount(5);await expect(page.locator('.bm-mode-note')).toContainText('가상 제도');await page.locator('.bm-card-body').first().click();await expect(page.locator('.bm-dialog')).toContainText('실제 사업이 아니며 신청할 수 없습니다');await expect(page.locator('.bm-dialog-actions a')).toHaveCount(0);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'연결된 제도',exact:true}).click();await expect(page.locator('.bm-card')).toHaveCount(0);
});
test('empty results and reset; preferences and searches never enter requests or storage',async({page})=>{
 const urls=[];page.on('request',r=>{if(r.url().includes('/api/benefits'))urls.push(r.url())});await page.clock.install();await page.goto('/services/benefits/');await expect(page.locator('.bm-card')).toHaveCount(8);
 await page.getByRole('textbox',{name:'안내 검색'}).fill('절대없는검색어');await page.getByLabel('관심 지역',{exact:true}).selectOption('서울특별시');await page.getByLabel('관심 연령대',{exact:true}).selectOption('청년');await expect(page.locator('.bm-card')).toHaveCount(0);await expect(page.locator('.bm-empty')).toContainText('조건에 맞는 결과가 없어요');await page.getByRole('button',{name:'검색 조건 초기화'}).click();await expect(page.locator('.bm-card')).toHaveCount(8);
 await page.locator('.bm-card-top button').first().click();await page.clock.fastForward('00:31:00');expect(urls.length).toBe(1);expect(new URL(urls[0]).search).toBe('');expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('benefit')))).toEqual([]);await page.reload();await expect(page.locator('.bm-card-top button.saved')).toHaveCount(0);
});
test('partial failure renders safe provider text, keeps valid results and reports limited scope',async({page})=>{
 await page.route('**/api/benefits',route=>route.fulfill({json:{checkedAt:new Date().toISOString(),sources:[{key:'gov24',status:'live',fetchedAt:'2026-10-26T00:00:00Z',data:[{id:'gov24:1',title:'공식 테스트 안내',summary:'<img src=x onerror=alert(1)>',organization:'테스트기관',regions:[],ages:[],topic:'생활',kind:'live',url:'https://www.gov.kr/'}]},{key:'central',status:'error',data:[]},{key:'local',status:'empty',data:[]}]}}));
 await page.goto('/services/benefits/');await page.getByRole('button',{name:'연결된 제도',exact:true}).click();await expect(page.locator('.bm-live-status')).toContainText('2 / 3');await expect(page.locator('.bm-partial')).toContainText('일부 기관');await expect(page.locator('.bm-card')).toHaveCount(1);await expect(page.locator('.bm-card-body p')).toContainText('<img');await expect(page.locator('.bm-card img')).toHaveCount(0);await expect(page.locator('.bm-mode-note')).toContainText('첫 100건');await expect(page.locator('.bm-source-state')).toContainText(['09:00','조회 실패','제공 결과 없음']);
});
test('network failure does not remove public guides; retry can recover',async({page})=>{
 let fail=true;await page.route('**/api/benefits',route=>fail?route.abort():route.fulfill({json:unavailable()}));await page.goto('/services/benefits/');await expect(page.locator('.bm-card')).toHaveCount(8);await page.getByRole('button',{name:'연결된 제도',exact:true}).click();await expect(page.getByRole('alert')).toContainText('확인');await expect(page.locator('.bm-card')).toHaveCount(0);fail=false;await page.getByRole('button',{name:'지원 제도 다시 조회'}).click();await expect(page.locator('.bm-source-state')).toContainText(Array(3).fill('연결 대기'));await expect(page.getByRole('alert')).toHaveCount(0);
});
test('malformed data fails visibly and browser limits excessive input',async({page})=>{
 await page.route('**/benefits-guides.json',route=>route.fulfill({json:{metadata:{count:1},data:[{id:'malformed'}]}}));await page.goto('/services/benefits/');await expect(page.getByRole('alert')).toContainText('공식 안내 자료를 불러오지 못했습니다');await expect(page.locator('.bm-card')).toHaveCount(0);const input=page.getByRole('textbox',{name:'안내 검색'});await input.fill('a'.repeat(200));expect((await input.inputValue()).length).toBeLessThanOrEqual(100);
});
test('desktop, mobile and detail modal fit without page errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1080});await page.goto('/services/benefits/');await expect(page.locator('.bm-card')).toHaveCount(8);await page.screenshot({path:'/workspace/benefits-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/workspace/benefits-mobile.png',fullPage:true});await page.locator('.bm-card-body').first().click();await expect(page.locator('.bm-dialog')).toBeVisible();expect(await page.locator('.bm-dialog').evaluate(e=>e.getBoundingClientRect().width<=innerWidth)).toBe(true);await page.getByRole('button',{name:'안내 닫기'}).click();expect(errors).toEqual([]);
});
