const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const { fetchPage, closeBrowser } = require('./utils/request');
const { parseHTML } = require('./utils/parser');
const { saveCSV } = require('./utils/csv');

class VietlottCrawler {
  constructor(isUpdateMode = false) {
    this.isUpdateMode = isUpdateMode;
    this.existingData = [];
    this.existingDrawSet = new Set();
    this.missingDrawsSet = new Set();
    this.progress = { lastPage: 1, lastDraw: 0 };
    this.allResultsMap = new Map();
  }

  initStorage() {
    if (!fs.existsSync(config.DATA_DIR)) {
      fs.mkdirSync(config.DATA_DIR, { recursive: true });
    }

    // 1. Đọc dữ liệu history6.json hiện có
    if (fs.existsSync(config.FILES.JSON)) {
      try {
        const raw = fs.readFileSync(config.FILES.JSON, 'utf-8');
        this.existingData = JSON.parse(raw);
        
        let maxDraw = 0;
        this.existingData.forEach((item) => {
          this.existingDrawSet.add(item.draw);
          this.allResultsMap.set(item.draw, item);
          if (item.draw > maxDraw) maxDraw = item.draw;
        });

        // Tìm các kỳ bị thiếu trong khoảng từ 1 -> maxDraw
        for (let d = 1; d <= maxDraw; d++) {
          if (!this.existingDrawSet.has(d)) {
            this.missingDrawsSet.add(d);
          }
        }

        logger.info(`Loaded ${this.existingData.length} records. Found ${this.missingDrawsSet.size} missing draws to fill.`);
      } catch (e) {
        logger.warn(`Failed to parse ${config.FILES.JSON}. Starting fresh.`);
      }
    }

    // 2. Load tiến trình resume nếu không phải chế độ update
    if (!this.isUpdateMode && fs.existsSync(config.FILES.PROGRESS)) {
      try {
        const raw = fs.readFileSync(config.FILES.PROGRESS, 'utf-8');
        this.progress = JSON.parse(raw);
        logger.info(`Resuming from progress file: Page ${this.progress.lastPage}`);
      } catch (e) {
        this.progress = { lastPage: 1, lastDraw: 0 };
      }
    }
  }

  saveProgress(page, draw) {
    this.progress = { lastPage: page, lastDraw: draw };
    fs.writeFileSync(config.FILES.PROGRESS, JSON.stringify(this.progress, null, 2), 'utf-8');
  }

  clearProgress() {
    if (fs.existsSync(config.FILES.PROGRESS)) {
      fs.unlinkSync(config.FILES.PROGRESS);
    }
  }

  async run() {
    try {
      this.initStorage();
      logger.info(`Starting crawler in [${this.isUpdateMode ? 'UPDATE / FILL MISSING' : 'FULL / RESUME'}] mode...`);

      let currentPage = this.isUpdateMode ? 1 : (this.progress.lastPage || 1);
      let stopEarly = false;

      while (!stopEarly) {
        const html = await fetchPage(currentPage);

        if (!html) {
          logger.info(`\nReached end of pagination.`);
          break;
        }

        const items = parseHTML(html);
        let lastDrawInPage = 0;

        if (items && items.length > 0) {
          let newItemsInPage = 0;

          for (const item of items) {
            lastDrawInPage = item.draw;

            // Kiểm tra xem kỳ này đã có trong bộ lưu trữ chưa
            if (!this.existingDrawSet.has(item.draw)) {
              this.allResultsMap.set(item.draw, item);
              this.existingDrawSet.add(item.draw);
              newItemsInPage++;

              // Nếu kỳ này nằm trong danh sách các kỳ thiếu, xóa khỏi danh sách thiếu
              if (this.missingDrawsSet.has(item.draw)) {
                this.missingDrawsSet.delete(item.draw);
              }
            }

            // ĐIỂM NGẮT 1: Đã lấy đến kỳ #1 (kỳ đầu tiên lịch sử Vietlott)
            if (item.draw === 1) {
              stopEarly = true;
            }
          }

          // ĐIỂM NGẮT 2: Trong chế độ UPDATE, nếu trang này không có kỳ mới nào VÀ đã bù hết các kỳ thiếu -> Dừng ngay
          if (this.isUpdateMode && newItemsInPage === 0 && this.missingDrawsSet.size === 0) {
            logger.info('\nAll latest draws and missing draws updated. Stopping.');
            stopEarly = true;
          }
        } else {
          logger.info(`\nNo more records parsed. Finishing...`);
          break;
        }

        logger.logProgress({
          currentPage,
          totalPages: 'Auto',
          currentDraw: lastDrawInPage,
          totalCollected: this.allResultsMap.size,
          retries: 0
        });

        this.saveProgress(currentPage, lastDrawInPage);

        if (stopEarly) break;
        currentPage++;
      }

      logger.finish();
      this.saveAndValidate();
    } finally {
      await closeBrowser();
    }
  }

  saveAndValidate() {
    const sortedData = Array.from(this.allResultsMap.values()).sort((a, b) => a.draw - b.draw);

    if (sortedData.length === 0) {
      logger.warn('No data collected.');
      return;
    }

    let duplicates = 0;
    const missing = [];
    const drawSet = new Set();

    for (let i = 0; i < sortedData.length; i++) {
      const current = sortedData[i];

      if (drawSet.has(current.draw)) {
        duplicates++;
      } else {
        drawSet.add(current.draw);
      }

      if (i > 0) {
        const prevDraw = sortedData[i - 1].draw;
        if (current.draw - prevDraw > 1) {
          for (let m = prevDraw + 1; m < current.draw; m++) {
            missing.push(m);
          }
        }
      }

      if (!Array.isArray(current.numbers) || current.numbers.length !== 6) {
        logger.warn(`Draw #${current.draw} does not have exactly 6 numbers.`);
      }
      if (typeof current.jackpot !== 'number' || isNaN(current.jackpot)) {
        logger.warn(`Draw #${current.draw} has invalid jackpot value.`);
      }
    }

    fs.writeFileSync(config.FILES.JSON, JSON.stringify(sortedData, null, 4), 'utf-8');
    saveCSV(config.FILES.CSV, sortedData);
    this.clearProgress();

    const firstDraw = sortedData[0].draw;
    const lastDraw = sortedData[sortedData.length - 1].draw;

    console.log('==========');
    console.log(`Total Draws : ${sortedData.length}`);
    console.log(`First Draw  : ${firstDraw}`);
    console.log(`Last Draw   : ${lastDraw}`);
    console.log(`Duplicates  : ${duplicates}`);
    console.log(`Missing     : ${missing.length > 0 ? missing.join(', ') : 'None'}`);
    console.log(`Output      : ${config.FILES.JSON}`);
    console.log(`              ${config.FILES.CSV}`);
    console.log('==========');
  }
}

const args = process.argv.slice(2);
const isUpdateMode = args.includes('update');

const crawler = new VietlottCrawler(isUpdateMode);
crawler.run().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  closeBrowser().then(() => process.exit(1));
});