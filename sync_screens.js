const fs = require('fs');
const path = require('path');
const https = require('https');

const STITCH_PROJECT_PATH = 'C:/Users/igomez/.gemini/antigravity/brain/3fce42c4-7ef0-4abd-8d5c-89d8c3810354/.system_generated/steps/93/output.txt';
const SCREENS_DIR = 'C:/Users/igomez/.gemini/antigravity/scratch/Rehogar/screens';

function toSnakeCase(str) {
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9\s]/g, '') // remove special chars (fixed regex)
        .trim()
        .replace(/\s+/g, '_');
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function sync() {
    const data = JSON.parse(fs.readFileSync(STITCH_PROJECT_PATH, 'utf8'));
    const screens = data.screens;

    console.log(`Found ${screens.length} screens in Stitch project.`);

    const usedNames = new Set();

    for (const screen of screens) {
        let name = toSnakeCase(screen.title);
        if (usedNames.has(name)) {
            // Append short ID if name exists
            const shortId = screen.name.split('/').pop().substring(0, 4);
            name = `${name}_${shortId}`;
        }
        usedNames.add(name);

        const targetDir = path.join(SCREENS_DIR, name);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        console.log(`Syncing screen: ${screen.title} -> ${name}`);

        // Download HTML
        if (screen.htmlCode && screen.htmlCode.downloadUrl) {
            try {
                await downloadFile(screen.htmlCode.downloadUrl, path.join(targetDir, 'code.html'));
                console.log(`  Downloaded HTML`);
            } catch (err) {
                console.error(`  Error downloading HTML for ${name}: ${err.message}`);
            }
        }

        // Download Screenshot
        if (screen.screenshot && screen.screenshot.downloadUrl) {
            try {
                await downloadFile(screen.screenshot.downloadUrl, path.join(targetDir, 'screen.png'));
                console.log(`  Downloaded Screenshot`);
            } catch (err) {
                console.error(`  Error downloading screenshot for ${name}: ${err.message}`);
            }
        }
    }

    console.log('Synchronization complete!');
}

sync().catch(console.error);
