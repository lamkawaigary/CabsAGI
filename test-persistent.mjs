import { chromium } from 'playwright';

(async () => {
  // Use persistent context to maintain login session
  const userDataDir = '/tmp/cabs-test-profile';
  
  const browser = await chromium.launchPersistentContext(userDataDir, { 
    headless: false,
    viewport: { width: 390, height: 844 },
  }).catch(() => null);
  
  if (!browser) {
    console.log('Creating new profile...');
    return;
  }
  
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  try {
    console.log('1. Go to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/cabs-1.png' });
    console.log('   URL:', page.url());
    
    // Check if logged in
    const url = page.url();
    if (url.includes('passenger-home') || url.includes('driver-home')) {
      console.log('   Already logged in!');
    } else {
      console.log('   Not logged in, need to login');
    }
    
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
