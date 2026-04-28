const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('file://C:/Users/Lindo/Documents/Proyectos/irontrack-app-b/scripts/filter_test.html');
    await page.waitForTimeout(2000); // Wait for images to load
    await page.screenshot({ path: 'scripts/filter_test.png' });
    await browser.close();
    console.log('Screenshot saved to scripts/filter_test.png');
})();
