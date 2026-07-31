const path = require('path');

module.exports = {
  // URL chính xác từ giao diện Vietlott
  URL: 'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-645',
  
  // Cấu hình concurrency & retry
  CONCURRENCY: 1,
  MAX_RETRIES: 5,
  RETRY_BASE_DELAY: 1000,
  
  // Đường dẫn file
  DATA_DIR: path.join(__dirname, 'data'),
  FILES: {
    JSON: path.join(__dirname, 'data', 'history6.json'),
    CSV: path.join(__dirname, 'data', 'history6.csv'),
    PROGRESS: path.join(__dirname, 'data', 'progress.json')
  },

  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  }
};