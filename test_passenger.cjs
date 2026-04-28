const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Maximize window
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  console.log('🚀 測試乘客流程');
  
  // Step 1: Go to landing page
  await page.goto('https://cabs-agi.vercel.app/landing');
  await page.waitForTimeout(2000);
  console.log('📍 Landing page URL:', page.url());
  
  // Check if logged in (might redirect to admin)
  if (page.url().includes('/admin')) {
    console.log('⚠️ 已作為 admin 登入，需要先登出');
    // Click profile/menu to find logout
    await page.goto('https://cabs-agi.vercel.app/profile');
    await page.waitForTimeout(1000);
    console.log('📍 Profile page URL:', page.url());
    
    // Try to find logout button
    const logoutBtn = await page.$('text=登出');
    if (logoutBtn) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ 已登出');
    }
  }
  
  // Step 2: Go to landing page again
  await page.goto('https://cabs-agi.vercel.app/landing');
  await page.waitForTimeout(2000);
  console.log('📍 Landing URL:', page.url());
  
  // Step 3: Look for login button
  const loginBtn = await page.$('text=登入');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ 點擊登入');
  }
  
  // Step 4: Look for Google login
  await page.waitForTimeout(2000);
  const googleBtn = await page.$('text=Google');
  if (googleBtn) {
    await googleBtn.click();
    console.log('✅ 點擊 Google 登入');
    
    // Wait for Google OAuth popup
    await page.waitForTimeout(5000);
  }
  
  console.log('📍 最終 URL:', page.url());
  
  // Take screenshot
  await page.screenshot({ path: 'test_result.png', fullPage: true });
  console.log('📸 截圖已保存: test_result.png');
  
  await browser.close();
  console.log('✅ 測試完成');
})();
