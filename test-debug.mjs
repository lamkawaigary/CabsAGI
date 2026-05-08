import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('1. Go to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Check what's on screen
    const html = await page.content();
    const hasStartBtn = html.includes('開始使用');
    const hasLoginBtn = html.includes('登入');
    console.log('   Has 開始使用:', hasStartBtn);
    console.log('   Has 登入:', hasLoginBtn);
    
    // Click 開始使用
    await page.click('button:has-text("開始使用")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/step1.png' });
    
    // Check if modal appeared
    const modalHtml = await page.content();
    const hasGoogleBtn = modalHtml.includes('Google');
    console.log('   Modal has Google:', hasGoogleBtn);
    
    if (hasGoogleBtn) {
      // Click Google login
      await page.click('button:has-text("使用 Google 登入")');
      await page.waitForTimeout(8000); // Wait for Google popup
      
      const currentUrl = page.url();
      console.log('   URL after Google click:', currentUrl);
      await page.screenshot({ path: '/tmp/step2.png' });
      
      // Check if we're on Google sign-in page
      if (currentUrl.includes('accounts.google.com')) {
        console.log('   On Google sign-in page');
        
        // Type email
        await page.fill('input[type="email"], input[type="text"]', 'lamkawaigary@gmail.com');
        await page.waitForTimeout(500);
        await page.click('#identifierNext, button:has-text("下一步")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/step3.png' });
        
        // Type password
        await page.fill('input[type="password"]', 'Test123456');
        await page.waitForTimeout(500);
        await page.click('#passwordNext, button:has-text("登入")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/tmp/step4.png' });
        console.log('   URL after login:', page.url());
      }
    }
    
    console.log('Waiting for auth to complete...');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: '/tmp/step5-final.png' });
    console.log('   Final URL:', page.url());
    
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
    
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error.png' });
  }
})();
