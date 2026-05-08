import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=CrossSiteDocumentInRealmIfSandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  try {
    console.log('1. Go to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Click 開始使用
    console.log('2. Click 開始使用...');
    await page.click('button:has-text("開始使用")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/a1-modal.png' });
    
    // Click Google login
    console.log('3. Click Google login...');
    const googleBtn = await page.$('button:has-text("使用 Google 登入")');
    if (googleBtn) {
      // Use Promise.race to handle either popup or direct navigation
      await Promise.race([
        googleBtn.click(),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      
      // Wait for potential popup
      await page.waitForTimeout(3000);
      
      // Check if new page opened (Google auth)
      const allPages = context.pages();
      console.log('   Pages open:', allPages.length);
      
      if (allPages.length > 1) {
        // Switch to the popup
        const popup = allPages[allPages.length - 1];
        console.log('   Popup URL:', popup.url());
        
        if (popup.url().includes('google.com')) {
          // Type email
          await popup.fill('input[type="email"], input[type="text"]', 'lamkawaigary@gmail.com');
          await popup.waitForTimeout(500);
          await popup.click('#identifierNext');
          await popup.waitForTimeout(2000);
          await popup.screenshot({ path: '/tmp/a2-email.png' });
          
          // Check for password field
          const pwdField = await popup.$('input[type="password"]');
          if (pwdField) {
            await popup.fill('input[type="password"]', 'Test123456');
            await popup.waitForTimeout(500);
            await popup.click('#passwordNext');
            await popup.waitForTimeout(5000);
            await popup.screenshot({ path: '/tmp/a3-loggedin.png' });
          }
        }
        
        // Wait for auth to complete
        await page.waitForTimeout(10000);
        await page.screenshot({ path: '/tmp/a4-result.png' });
        console.log('   Final URL:', page.url());
      } else {
        // Popup might have been blocked - try direct navigation approach
        console.log('   No popup detected, checking for OAuth URL...');
        
        // Try to navigate to Google OAuth directly
        await page.goto('https://accounts.google.com/v3/signin/identifier?hd=zerototendesign.com', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/a2-direct.png' });
      }
    }
    
    console.log('Done! URL:', page.url());
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
