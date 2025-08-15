import fs from 'fs';
import yaml from 'js-yaml';
import puppeteer from 'puppeteer';

// Load YAML
const fileContents = fs.readFileSync('./gh3_songs_leaderboards.yml', 'utf8');
const songs = yaml.load(fileContents);

async function fetchLeaderboard(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table');

  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr')).slice(1);
    return rows
      .map(row => {
        const cols = row.querySelectorAll('td');
        if (!cols || cols.length < 4) return null;
        const rankText = cols[0].innerText.trim();
        if (!/^\d/.test(rankText)) return null;
        return {
          rank: rankText,
          player: cols[1].innerText.trim(),
          score: cols[2].innerText.trim(),
          percentage: cols[3].innerText.trim()
        };
      })
      .filter(Boolean);
  });

  await browser.close();
  return data;
}

(async () => {
  for (const [key, song] of Object.entries(songs)) {
    if (!song.leaderboards) continue;

    try {
      const leaderboard = await fetchLeaderboard(song.leaderboards);
      fs.writeFileSync(`leaderboards/${key}.json`, JSON.stringify(leaderboard, null, 2));
      console.log(`Saved leaderboard for ${song.title}`);
    } catch (err) {
      console.error(`Error scraping ${song.title}:`, err);
    }
  }
})();