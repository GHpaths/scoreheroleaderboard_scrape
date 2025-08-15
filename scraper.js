import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import puppeteer from "puppeteer";

// --- Config ---
const YAML_FILE = "./gh3song_leaderboards.yml";
const OUTPUT_DIR = path.join(process.cwd(), "leaderboards");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- Helper function to scrape a single leaderboard ---
async function scrapeLeaderboard(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("table");

  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tr")).slice(1);
    return rows
      .map((row) => {
        const cols = row.querySelectorAll("td");
        if (!cols || cols.length < 4) return null;
        const rankText = cols[0].innerText.trim();
        if (!/^\d/.test(rankText)) return null;
        return {
          rank: rankText,
          player: cols[1].innerText.trim(),
          score: cols[3].innerText.trim(),
          // percentage: cols[8].innerText.trim(),
          platform: cols[2].innerText.trim(),
        };
      })
      .filter(Boolean);
  });

  await browser.close();
  return data;
}

// --- Main function ---
async function main() {
  console.log("Reading YAML file...");
  const fileContents = fs.readFileSync(YAML_FILE, "utf8");
  const leaderboardsYAML = yaml.load(fileContents);
  for (const [shortname, info] of Object.entries(leaderboardsYAML)) {
    if (!info.leaderboards) {
      console.log(`Skipping ${shortname}, no leaderboard URL found.`);
      continue;
    }

    console.log(`Scraping ${shortname} from ${info.leaderboards}...`);
    try {
      const leaderboard = await scrapeLeaderboard(info.leaderboards);

      const outPath = path.join(OUTPUT_DIR, `${shortname}_all_leaderboards.json`);
      fs.writeFileSync(outPath, JSON.stringify({ entries: leaderboard }, null, 2));
      console.log(`Saved ${outPath} with ${leaderboard.length} entries.`);
    } catch (err) {
      console.error(`Error scraping ${shortname}:`, err);
    }
  }

  console.log("Done!");
}

main();