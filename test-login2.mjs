import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  
  page.on('console', msg => {
    console.log('CONSOLE:', msg.type(), msg.text());
  });

  try {
    console.log('1. Go to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/step1.png' });
    console.log('   URL:', page.url());
    
    // Click role selection if on it
    const passengerBtn = await page.$('text=乘客');
    if (passengerBtn) {
      console.log('2. Selecting passenger role...');
      await passengerBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/step2.png' });
    }
    
    // Click login
    console.log('3. Looking for login...');
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await btn.textContent();
      console.log('   Button:', text?.trim());
    }
    
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
