import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  
  let step = 1;
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  try {
    console.log(`${step++}. Go to app...`);
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/1-landing.png' });
    console.log('   URL:', page.url());
    
    // Check if we're logged in (should redirect based on auth state)
    // If on landing page, we might need to login
    
    // Click 開始使用
    console.log(`${step++}. Click 開始使用...`);
    const startBtn = await page.$('button:has-text("開始使用")');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/2-after-start.png' });
      console.log('   URL:', page.url());
    }
    
    // Check if we're on role selection or need to select passenger
    const passengerBtn = await page.$('button:has-text("乘客"), div:has-text("乘客")');
    if (passengerBtn) {
      console.log(`${step++}. Selecting passenger...`);
      await passengerBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/3-passenger.png' });
    }
    
    // Now we're at passenger home - go to browse trips
    console.log(`${step++}. Navigate to browse trips...`);
    await page.goto('https://cabs-agi.vercel.app/browse-trips', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/4-browse.png' });
    console.log('   URL:', page.url());
    
    // Look for a trip and click 加入
    console.log(`${step++}. Looking for trips to join...`);
    const joinBtn = await page.$('button:has-text("加入")');
    if (joinBtn) {
      console.log('   Found join button, clicking...');
      await joinBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/5-after-join.png' });
      console.log('   URL:', page.url());
    } else {
      console.log('   No join button found, checking for trips...');
      const tripCards = await page.$$('[style*="borderRadius: 16"]');
      console.log(`   Found ${tripCards.length} cards`);
    }
    
    console.log('Done!');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error.png' });
  }
})();
