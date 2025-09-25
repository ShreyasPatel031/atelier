const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });
  
  await page.goto('http://localhost:3002');
  await page.waitForSelector('.react-flow');
  
  console.log('🧪 Looking for export button...');
  
  // Check all buttons
  const buttons = await page.$$('button');
  console.log('Found', buttons.length, 'buttons');
  
  for (let i = 0; i < buttons.length; i++) {
    const title = await buttons[i].getAttribute('title');
    const text = await page.evaluate(el => el.textContent, buttons[i]);
    console.log('Button', i, ':', title, '|', text);
  }
  
  // Try to find and click export button
  const exportButton = await page.$('button[title*="Export architecture"]');
  if (exportButton) {
    console.log('✅ Found export button, clicking...');
    await exportButton.click();
    
    // Wait for export to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    console.log('❌ Export button not found');
  }
  
  await browser.close();
})().catch(console.error);
