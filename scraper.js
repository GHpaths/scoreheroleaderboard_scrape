// scraper.js
import puppeteer from "puppeteer";
import fs from "fs";

const URL = "https://www.scorehero.com/rankings.php?group=4&game=6&diff=4&song=1416&page=1";

async function scrapeLeaderboard() {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("table");

    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tr")).slice(1); // skip header
      return rows
        .map(row => {
          const cols = row.querySelectorAll("td");
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

    fs.writeFileSync("leaderboard.json", JSON.stringify({ entries: data }, null, 2));
    console.log(`Leaderboard saved with ${data.length} entries`);

  } catch (err) {
    console.error("Error scraping leaderboard:", err);
  }
}

scrapeLeaderboard();