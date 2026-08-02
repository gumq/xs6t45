exports.handler = async function(event, context) {
  try {
    // Gọi sang trang Minh Ngọc - Nguồn dữ liệu Vietlott cực kỳ ổn định, không chặn IP Cloud
    const targetUrl = 'https://www.minhngoc.net.vn/ket-qua-xo-so/vietlott/mega-6x45.html';

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Nguồn dữ liệu trả về lỗi HTTP: ${response.status}` })
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
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};