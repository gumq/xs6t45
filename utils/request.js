const puppeteer = require('puppeteer');
const config = require('../config');

let browserInstance = null;
let pageInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800'
      ]
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

  // 1. Mở trang đầu tiên
  if (!pageInstance) {
    pageInstance = await browser.newPage();
    await pageInstance.setUserAgent(config.HEADERS['User-Agent']);
    await pageInstance.setViewport({ width: 1280, height: 800 });
    
    // Đặt Timeout xịn hơn và chờ Network rảnh rỗi
    await pageInstance.goto(config.URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await pageInstance.waitForSelector('table, .day_so_ket_qua_v2', { timeout: 20000 }).catch(() => {});
  }

  // 2. Xử lý phân trang cho pageNumber > 1
  if (pageNumber > 1) {
    // Lưu lại HTML cũ trước khi bấm nút để so sánh
    const oldContent = await pageInstance.content();

    const success = await pageInstance.evaluate((p) => {
      const paginationBtns = Array.from(document.querySelectorAll('.pagination li a, .paging a, ul li a, .page-link'));
      
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

    // THAY THẾ setTimeout BẰNG CƠ CHẾ CHỜ AJAX THẬT:
    // Chờ cho đến khi HTML thay đổi khác với oldContent (Tối đa 10 giây)
    try {
      await pageInstance.waitForFunction(
        (oldHtml) => document.body.innerHTML !== oldHtml,
        { timeout: 10000 },
        oldContent
      );
    } catch (e) {
      console.log(`[WARN] Chờ tải trang ${pageNumber} bị quá thời gian, tiến hành đọc tiếp...`);
    }

    // Nghỉ thêm 1s cho DOM ổn định hoàn toàn
    await new Promise((r) => setTimeout(r, 1000));
  }

  return await pageInstance.content();
}

module.exports = {
  fetchPage,
  closeBrowser
};