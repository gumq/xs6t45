const fs = require('fs');
const path = require('path');

/**
 * Chuyển mảng JSON dữ liệu thành chuỗi CSV và ghi file
 */
function saveCSV(filePath, records) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const header = 'draw,date,n1,n2,n3,n4,n5,n6,jackpot\n';
  
  const rows = records.map((item) => {
    const [n1, n2, n3, n4, n5, n6] = item.numbers;
    return `${item.draw},${item.date},${n1},${n2},${n3},${n4},${n5},${n6},${item.jackpot}`;
  }).join('\n');

  fs.writeFileSync(filePath, header + rows, 'utf-8');
}

module.exports = {
  saveCSV
};