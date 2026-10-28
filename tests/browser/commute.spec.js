import {test,expect} from '@playwright/test';
const keys=['bus','subway','weather','air'];
test.beforeEach(async({page})=>{await page.route('**/api/commute?*',route=>route.fulfill({json:{checkedAt:new Date().toISOString(),sources:keys.map(key=>({key,status:'needs_key',data:null}))}}))});
test('atlas links to service; missing feeds and demo are distinct; preferences persist',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('.commute-promo').click();await expect(page).toHaveURL(/\/services\/commute\//);
 await expect(page.locator('.cm-mode')).toContainText('실시간 연결 0 / 4');await expect(page.locator('.cm-status')).toHaveText(['연결 필요','연결 필요','연결 필요','연결 필요']);
 await expect(page.locator('.cm-depart')).toContainText('07:35');
 await page.getByRole('button',{name:'예시로 체험하기'}).click();await expect(page.locator('.cm-mode')).toContainText('가상 데이터');await expect(page.locator('.cm-status')).toHaveText(Array(4).fill('체험용 예시'));
 await expect(page.locator('.cm-checklist')).toContainText('초미세먼지');
 await page.getByRole('button',{name:'설정 변경'}).click();await page.getByLabel('출발 지역',{exact:true}).selectOption('goyang');await page.getByLabel('서울 도착역',{exact:true}).selectOption('여의도');await page.getByLabel('도착 희망 시각').fill('08:30');await page.getByLabel('평소 이동 (분)').fill('50');await page.getByRole('button',{name:'출근 설정 저장'}).click();
 await expect(page.locator('.cm-route')).toContainText('고양');await expect(page.locator('.cm-depart')).toContainText('07:20');await page.reload();await expect(page.locator('.cm-route')).toContainText('여의도');await expect(page.locator('.cm-depart')).toContainText('07:20');await expect(page.locator('.cm-mode')).toContainText('실시간 연결 0 / 4');expect(errors).toEqual([]);
});
test('partial data stays partial, no data is classified as good, mobile fits',async({page})=>{
 await page.route('**/api/commute?*',route=>route.fulfill({json:{checkedAt:new Date(Date.now()-180000).toISOString(),sources:[{key:'air',status:'live',data:{pm25:null,pm10:null,observedAt:'2026-10-26 08:00'}},...['bus','weather','subway'].map(key=>({key,status:'error',data:null}))]}}));
 await page.setViewportSize({width:1440,height:1080});await page.goto('/services/commute/');await expect(page.locator('.cm-mode')).toContainText('실시간 연결 1 / 4');await expect(page.locator('.cm-mode')).toContainText('2분 경과');await expect(page.locator('.cm-data-card.air')).toContainText('측정 정보 없음');
 await page.screenshot({path:'/workspace/commute-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/workspace/commute-mobile.png',fullPage:true});
});
test('network failure offers retry without showing example measurements',async({page})=>{
 await page.route('**/api/commute?*',route=>route.abort());await page.goto('/services/commute/');await expect(page.getByRole('alert')).toContainText('불러오지 못했습니다');await expect(page.locator('.cm-status')).toHaveText(Array(4).fill('조회 실패'));
});
