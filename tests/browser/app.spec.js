import { test, expect } from '@playwright/test';
import {sampleData} from '../../src/data.js';
test.beforeEach(async({page})=>{await page.route('**/catalog.json',route=>route.fulfill({json:{metadata:{count:sampleData.length,collectedAt:'2026-10-26T00:00:00Z'},data:sampleData}}))});
test('search, filters, bookmarks, details, and pagination',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('.api-card')).toHaveCount(6);
 await page.getByRole('button',{name:'API 더 보기'}).click();await expect(page.locator('.api-card')).toHaveCount(12);
 await page.getByRole('textbox',{name:'API 검색'}).fill('버스');await expect(page.locator('.api-card')).toHaveCount(1);
 await page.getByRole('button',{name:'전국 버스 정류장 정보 저장',exact:true}).click();
 await page.getByRole('button',{name:'전국 버스 정류장 정보 상세 보기'}).click();await expect(page.locator('dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'검색어 지우기'}).click();
 await page.getByRole('button',{name:/저장한 API/}).click();await expect(page.locator('.api-card')).toHaveCount(1);
 await page.reload();await page.getByRole('button',{name:/저장한 API/}).click();await expect(page.locator('.api-card')).toHaveCount(1);
 await page.getByRole('button',{name:'전국 버스 정류장 정보 저장 해제'}).click();await expect(page.getByText('아직 저장한 API가 없어요')).toBeVisible();
 await page.getByRole('button',{name:'전체 API 둘러보기'}).click();
 await page.locator('.category-block').filter({hasText:'교육'}).click();await expect(page.locator('.api-card')).toHaveCount(1);
 await page.getByRole('combobox',{name:'데이터 형식'}).selectOption('CSV');await expect(page.getByText('검색 결과가 없어요')).toBeVisible();
 expect(errors).toEqual([]);
});
test('valid and invalid imports',async({page})=>{
 await page.goto('/');
 await page.locator('input[type=file]').setInputFiles({name:'catalog.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sampleData.slice(0,2)))});
 await expect(page.locator('.api-card')).toHaveCount(2);await expect(page.getByRole('status')).toContainText('2개 API');
 await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('[{}]')});
 await expect(page.getByRole('status')).toContainText('가져오기 실패');await expect(page.locator('.api-card')).toHaveCount(2);
});
test('desktop and mobile layout',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});await page.goto('/');
 await page.screenshot({path:'/workspace/atlas-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'메뉴 열기'}).click();await page.getByRole('navigation',{name:'카테고리',exact:true}).getByRole('button',{name:/보건의료/}).click();
 await expect(page.locator('.api-card')).toHaveCount(3);
 await page.screenshot({path:'/workspace/atlas-mobile.png',fullPage:true,animations:'disabled'});
});
