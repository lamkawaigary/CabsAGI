import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
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
    await page.screenshot({ path: '/tmp/c1-modal.png' });
    
    // Check for email/password tab - the modal might have a different login option
    const pageContent = await page.content();
    const hasEmailTab = pageContent.includes('電話') || pageContent.includes('email') || pageContent.includes('帳號');
    console.log('   Has alternative login options:', hasEmailTab);
    
    // Switch to phone tab for phone OTP login
    const phoneTab = await page.$('button:has-text("電話")');
    if (phoneTab) {
      console.log('3. Clicking phone tab...');
      await phoneTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/c2-phone-tab.png' });
      
      // Check the modal content
      const modalContent = await page.content();
      console.log('   Modal has phone input:', modalContent.includes('852'));
    }
    
    console.log('Waiting 20 seconds for user to complete auth...');
    await page.waitForTimeout(20000);
    await page.screenshot({ path: '/tmp/c3-result.png' });
    console.log('   Final URL:', page.url());
    
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
