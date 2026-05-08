import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // Listen for Firebase redirect
  page.on('response', response => {
    const url = response.url();
    if (url.includes('firebase') || url.includes('google')) {
      console.log('Firebase/Google response:', url.substring(0, 80));
    }
  });

  try {
    console.log('1. Go to app...');
    await page.goto('https://cabs-agi.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Intercept Google OAuth by redirecting instead of popup
    // This requires modifying the auth flow
    
    // Instead, let's use a workaround: inject a modified version
    console.log('2. Trying direct navigation approach...');
    
    // Navigate to Google sign-in directly
    const googleAuthUrl = 'https://accounts.google.com/v3/signin/identifier?hd=zerototendesign.com&checkedMimeType=application/x-www-form-urlencoded&continue=https://cabs-agi-a779f.firebaseapp.com/__/auth/handler&flowName=GeneralOAuthFlow&followup=https://cabs-agi-a779f.firebaseapp.com/__/auth/handler&ifkv=AT_z8FKcW0tYfW4F0g&as=AT_z8FKcW0tYfW4F0g&pst=1&塑性&tl=AT_z8FKcW0tYfW4F0g&aid=AT_z8FKcW0tYfW4F0g';
    
    await page.goto(googleAuthUrl, { timeout: 15000 }).catch(e => console.log('Direct nav failed:', e.message));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/b1-google.png' });
    
    // Fill email
    const emailInput = await page.$('input[type="email"], input[type="text"]#identifierId');
    if (emailInput) {
      console.log('3. Found email input, filling...');
      await emailInput.fill('lamkawaigary@gmail.com');
      await page.waitForTimeout(500);
      await page.click('#identifierNext');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/b2-password.png' });
      
      // Fill password
      const pwdInput = await page.$('input[type="password"]');
      if (pwdInput) {
        console.log('4. Found password input, filling...');
        await pwdInput.fill('Test123456');
        await page.waitForTimeout(500);
        await page.click('#passwordNext');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/tmp/b3-result.png' });
        console.log('   URL after login:', page.url());
      }
    }
    
    // Wait for redirect to app
    await page.waitForTimeout(10000);
    await page.screenshot({ path: '/tmp/b4-final.png' });
    console.log('   Final URL:', page.url());
    
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
