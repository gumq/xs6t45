const cheerio = require('cheerio');

function parseDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return dateStr.trim();
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseJackpot(jackpotStr) {
  if (!jackpotStr) return 0;
  const cleanStr = jackpotStr.replace(/[^0-9]/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

function parseHTML(htmlContent) {
  if (!htmlContent) return [];
  const $ = cheerio.load(htmlContent);
  const results = [];

  $('table tbody tr, table tr').each((_, element) => {
    const $el = $(element);
    const cells = $el.find('td');

    if (cells.length < 3) return;

    // Cột 1: Ngày quay (dd/mm/yyyy)
    const dateText = cells.eq(0).text().trim();
    const date = parseDate(dateText);

    // Cột 2: Mã kỳ quay (vd: 01543 -> 1543)
    const drawText = cells.eq(1).text().trim();
    const drawMatch = drawText.match(/\d+/);
    if (!drawMatch) return;
    const draw = parseInt(drawMatch[0], 10);

    // Cột 3: 6 số trúng thưởng trong các bong_tron / span
    const numbers = [];
    $el.find('.bong_tron, .day_number span, span, div').each((_, numEl) => {
      const txt = $(numEl).text().trim();
      if (/^\d{1,2}$/.test(txt)) {
        const val = parseInt(txt, 10);
        if (val >= 1 && val <= 45 && !numbers.includes(val)) {
          numbers.push(val);
        }
      }
    });

    // Cột 4 (nếu có) hoặc mặc định Jackpot
    const jackpotText = cells.length >= 4 ? cells.eq(3).text().trim() : '';
    const jackpot = parseJackpot(jackpotText);

    if (draw > 0 && date && numbers.length === 6) {
      results.push({
        draw,
        date,
        numbers: numbers.sort((a, b) => a - b),
        jackpot
      });
    }
  });

  return results;
}

module.exports = {
  parseHTML
};