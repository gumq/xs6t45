const readline = require('readline');

class Logger {
  constructor() {
    this.startTime = Date.now();
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  logProgress({ currentPage, totalPages, currentDraw, totalCollected, retries = 0, speed = 0 }) {
    const elapsedMs = Date.now() - this.startTime;
    const timeElapsed = this.formatTime(elapsedMs);
    
    let estimatedRemaining = 'Calculating...';
    if (totalPages && currentPage) {
      const remainingPages = totalPages - currentPage;
      if (remainingPages >= 0 && elapsedMs > 0) {
        const msPerPage = elapsedMs / currentPage;
        estimatedRemaining = this.formatTime(remainingPages * msPerPage);
      }
    }

    const logMsg = `[PAGE ${currentPage}/${totalPages || '?'}] | Draw: #${currentDraw || 'N/A'} | Total: ${totalCollected} | Retries: ${retries} | Elapsed: ${timeElapsed} | ETA: ${estimatedRemaining}`;

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(logMsg);
  }

  info(msg) {
    console.log(`\n[INFO] ${msg}`);
  }

  warn(msg) {
    console.log(`\n[WARN] ${msg}`);
  }

  error(msg) {
    console.log(`\n[ERROR] ${msg}`);
  }

  finish() {
    console.log('\n');
  }
}

module.exports = new Logger();