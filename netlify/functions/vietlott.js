// URL chính xác của Vietlott Mega 6/45
const TARGET_URL = 'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-645';

const fetchVietlottData = async () => {
  const response = await fetch(TARGET_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: `Vietlott HTTP status: ${response.status}` })
    };
  }

  const html = await response.text();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    },
    body: html
  };
};

// Khai báo theo chuẩn CommonJS
exports.handler = async function(event, context) {
  try {
    return await fetchVietlottData();
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Khai báo thêm theo chuẩn ES Module (Tránh trường hợp dự án bật type: "module")
if (typeof module !== 'undefined' && module.exports) {
  module.exports.handler = exports.handler;
}