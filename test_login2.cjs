const { chromium } = require('playwright');

(async () => {
  console.log('🚀 使用 Playwright 自動登入測試');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  try {
    // Navigate to app and trigger login
    await page.goto('https://cabs-agi.vercel.app/landing');
    await page.waitForTimeout(2000);
    
    // Click login button
    await page.click('text=登入');
    await page.waitForTimeout(1000);
    
    // Click Google login
    await page.click('text=Google');
    console.log('✅ 點擊了 Google 登入');
    
    // Wait for popup window
    await page.waitForTimeout(3000);
    
    // Check all windows
    const pages = browser.contexts()[0].pages();
    console.log('📍 Window count:', pages.length);
    
    // If there's a new window, handle it
    for (const p of pages) {
      console.log('   Window URL:', p.url());
    }
    
    // Try to interact with any Google sign-in page
    const googlePage = pages.find(p => p.url().includes('google.com'));
    if (googlePage) {
      console.log('✅ 找到 Google 登入頁面');
      await googlePage.fill('input[type="email"]', 'Lamkawaigary@gmail.com');
      await googlePage.click('button:has-text("下一步")');
      await page.waitForTimeout(2000);
      await googlePage.fill('input[type="password"]', 'Happylife2026');
      await googlePage.click('button:has-text("登入")');
      console.log('✅ 填入密碼');
    }
    
    await page.waitForTimeout(5000);
    console.log('📍 最終 URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ path: 'login_final.png', fullPage: true });
    console.log('📸 截圖已保存: login_final.png');
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    await page.screenshot({ path: 'login_error.png', fullPage: true });
  }
  
  await browser.close();
  console.log('✅ 完成');
})();
