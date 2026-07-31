const puppeteer = require('puppeteer');
const config = require('../config');

let browserInstance = null;
let pageInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
  return browserInstance;
}

async function closeBrowser() {
  if (pageInstance) {
    await pageInstance.close().catch(() => {});
    pageInstance = null;
  }
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

async function fetchPage(pageNumber) {
  const browser = await getBrowser();

  if (!pageInstance) {
    pageInstance = await browser.newPage();
    await pageInstance.setUserAgent(config.HEADERS['User-Agent']);
    await pageInstance.setViewport({ width: 1280, height: 800 });
    
    await pageInstance.goto(config.URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await pageInstance.waitForSelector('table', { timeout: 15000 }).catch(() => {});
  }

  if (pageNumber > 1) {
    const success = await pageInstance.evaluate(async (p) => {
      const paginationBtns = Array.from(document.querySelectorAll('.pagination li a, .paging a, ul li a'));
      
      // Tìm nút bấm số trang chính xác
      let targetBtn = paginationBtns.find(el => el.textContent.trim() === String(p));
      
      // Nếu không thấy nút số, bấm nút Next '>' hoặc '»'
      if (!targetBtn) {
        targetBtn = paginationBtns.find(el => el.textContent.trim() === '»' || el.textContent.trim() === '>');
      }

      if (targetBtn && !targetBtn.parentElement.classList.contains('disabled')) {
        targetBtn.click();
        return true;
      }

      return false;
    }, pageNumber);

    if (!success) {
      return null;
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  return await pageInstance.content();
}

module.exports = {
  fetchPage,
  closeBrowser
};