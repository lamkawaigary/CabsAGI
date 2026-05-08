import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=390,844']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  // Add network monitoring for errors
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  try {
    console.log('1. Go to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/1-landing.png' });
    
    console.log('2. Click 開始使用 button...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const txt = await btn.textContent();
      console.log('   Button:', txt?.trim());
    }
    
    // Find and click the button with "開始使用"
    await page.click('button:has-text("開始使用")', { timeout: 5000 }).catch(() => {
      console.log('   Could not find 開始使用 button');
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/2-modal.png' });
    
    console.log('3. Check URL after click:', page.url());
    
    // Look for Google login button in modal
    console.log('4. Looking for Google login...');
    const googleBtn = await page.$('button:has-text("Google")');
    if (googleBtn) {
      console.log('   Found Google button, clicking...');
      await googleBtn.click();
      
      // Wait for popup/redirect
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/tmp/3-after-google.png' });
      console.log('   URL after Google click:', page.url());
      
      // Handle any popup windows
      const contexts = browser.contexts();
      console.log('   Browser contexts:', contexts.length);
    }
    
    console.log('Waiting 30 seconds for user to complete login...');
    await page.waitForTimeout(30000);
    await page.screenshot({ path: '/tmp/4-after-wait.png' });
    console.log('   Final URL:', page.url());
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error.png' });
  }
  
  // Keep browser open for inspection
  console.log('Browser still open. Press Ctrl+C to exit.');
  await new Promise(() => {});
})();
