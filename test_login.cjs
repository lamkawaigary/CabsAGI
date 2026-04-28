const { chromium } = require('playwright');

(async () => {
  console.log('🚀 嘗試用 Lamkawaigary@gmail.com 登入...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // Go to landing page
  await page.goto('https://cabs-agi.vercel.app/landing');
  await page.waitForTimeout(2000);
  
  console.log('📍 URL:', page.url());
  
  // Try to click login
  const loginBtn = await page.$('text=登入');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(1000);
  }
  
  // Click Google login
  const googleBtn = await page.$('text=Google');
  if (googleBtn) {
    console.log('✅ 找到 Google 登入按鈕');
    await googleBtn.click();
    
    // Wait for popup or redirect
    await page.waitForTimeout(5000);
    console.log('📍 URL after Google click:', page.url());
    
    // Check if there's a Google OAuth popup
    const handles = browser.windows();
    console.log('🔗 Window count:', handles.length);
  }
  
  await page.screenshot({ path: 'login_result.png', fullPage: true });
  console.log('📸 截圖已保存');
  
  await browser.close();
  console.log('✅ 完成');
})();
