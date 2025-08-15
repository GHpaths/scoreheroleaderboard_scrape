import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import puppeteer from "puppeteer";

// --- Config ---
const YAML_FILE = "./gh3song_leaderboards.yml";
// Save directly in repo so Git can commit them
const OUTPUT_DIR = path.join(process.cwd(), "leaderboards");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- Helper function to scrape a single leaderboard ---
async function scrapeLeaderboard(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("table", { timeout: 15000 });
  } catch (err) {
    console.error(`Timeout loading ${url}:`, err);
    await browser.close();
    return [];
  }

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
          Percent: cols[7].innerText.trim(),
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

      // Write JSON to repo folder
      fs.writeFileSync(outPath, JSON.stringify({ entries: leaderboard }, null, 2));
      console.log(`Saved ${outPath} with ${leaderboard.length} entries.`);
    } catch (err) {
      console.error(`Error scraping ${shortname}:`, err);
    }
  }

  console.log("Done!");
}

main();