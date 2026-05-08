import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
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
    console.log('Navigating to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/cabs-1.png' });
    console.log('Screenshot: /tmp/cabs-1.png');
    
    const url = page.url();
    console.log('Current URL:', url);
    
    console.log('Browser opened - please login with lamkawaigary@gmail.com manually');
    console.log('Press Ctrl+C when done');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
