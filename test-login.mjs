import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=390,844'] // iPhone 14 size
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  try {
    console.log('1. Navigating to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   Page loaded');
    await page.screenshot({ path: '/tmp/cabs-1-home.png' });
    
    console.log('2. Looking for login button...');
    const loginBtn = await page.$('button:has-text("登入"), a:has-text("登入")');
    if (loginBtn) {
      console.log('   Found login button, clicking...');
      await loginBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/cabs-2-click-login.png' });
    }
    
    console.log('3. Looking for Google login button...');
    const googleBtn = await page.$('button:has-text("Google"), button:has-text("谷歌")');
    if (googleBtn) {
      console.log('   Found Google login, clicking...');
      await googleBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/cabs-3-after-google.png' });
      console.log('   URL after click:', page.url());
    }
    
    console.log('Done. Screenshots saved.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/cabs-error.png' });
  }
})();
