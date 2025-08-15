import puppeteer from 'puppeteer';
import fs from 'fs-extra';

const LEADERBOARD_URL = 'https://www.scorehero.com/some-leaderboard-url/'; // Replace with the actual page

async function scrapeLeaderboard() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(LEADERBOARD_URL, { waitUntil: 'networkidle2' });

    // Scrape leaderboard data
    const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
            const cells = row.querySelectorAll('td');
            return {
                rank: cells[0]?.innerText.trim(),
                userName: cells[1]?.innerText.trim(),
                score: parseInt(cells[2]?.innerText.replace(/,/g, '') || 0),
                percentage: cells[3]?.innerText.trim(),
                fullCombo: cells[4]?.innerText.trim() === 'FC'
            };
        });
    });

    await browser.close();

    // Save to JSON
    await fs.outputJson('leaderboard.json', { entries: data }, { spaces: 2 });
    console.log('Leaderboard scraped successfully!');
}

scrapeLeaderboard().catch(err => {
    console.error('Error scraping leaderboard:', err);
    process.exit(1);
});