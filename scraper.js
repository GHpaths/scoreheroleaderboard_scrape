import fs from 'fs';
import puppeteer from 'puppeteer';

(async () => {
  const url = 'https://www.scorehero.com/rankings.php?group=4&game=6&diff=4&song=1416&page=1';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const entries = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    return rows.slice(1).map(row => {
      const cells = row.querySelectorAll('td');
      if (!cells.length) return null;

      return {
        rank: parseInt(cells[0].innerText) || cells[0].innerText,
        userName: cells[1]?.innerText || 'N/A',
        best_run: {
          score: parseInt(cells[2].innerText.replace(/,/g, '')) || 0,
          accuracy: parseFloat(cells[3].innerText.replace('%','')) || 0,
          difficulty: 4,   // or parse from somewhere else if needed
          instrument: 1,   // default guitar
          stars: 0,        // not available in table
          fullcombo: false // not available in table
        },
        sessions: [] // optional if you don’t have session info
      };
    }).filter(Boolean);
  });

  fs.writeFileSync('public/leaderboard.json', JSON.stringify({ entries }, null, 2));
  await browser.close();
  console.log('Leaderboard updated!');
})();