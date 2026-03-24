const fs = require('fs');
const path = require('path');
const https = require('https');

const STITCH_PROJECT_PATH = 'C:/Users/igomez/.gemini/antigravity/brain/3fce42c4-7ef0-4abd-8d5c-89d8c3810354/.system_generated/steps/93/output.txt';
const SCREENS_DIR = 'C:/Users/igomez/.gemini/antigravity/scratch/Rehogar/screens';

function toSnakeCase(str) {
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9\s_]/g, '') // remove special chars (allowing underscores)
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
    const finalScreens = []; // To keep track of what we download

    for (const screen of screens) {
        let name = toSnakeCase(screen.title);
        // The user wants to remove duplicates. If we find the same title again, 
        // we'll only keep the last one (assuming it's the latest in the JSON).
        // Actually, let's keep track of titles and only sync each title once.
        
        if (!finalScreens.find(s => s.name === name)) {
            finalScreens.push({ name, screen });
        } else {
            // Update existing one if we want latest, but usually Stitch order is fine.
            // Let's just skip if already added to avoid duplicates in the FIRST place.
            console.log(`Skipping duplicate title: ${screen.title} (${name})`);
            continue;
        }
    }

    console.log(`Will sync ${finalScreens.length} unique screens.`);

    for (const item of finalScreens) {
        const { name, screen } = item;
        const targetDir = path.join(SCREENS_DIR, name);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        console.log(`Syncing screen: ${screen.title} -> ${name}`);

        // Download HTML
        if (screen.htmlCode && screen.htmlCode.downloadUrl) {
            try {
                await downloadFile(screen.htmlCode.downloadUrl, path.join(targetDir, 'code.html'));
            } catch (err) {
                console.error(`  Error downloading HTML for ${name}: ${err.message}`);
            }
        }

        // Download Screenshot
        if (screen.screenshot && screen.screenshot.downloadUrl) {
            try {
                await downloadFile(screen.screenshot.downloadUrl, path.join(targetDir, 'screen.png'));
            } catch (err) {
                console.error(`  Error downloading screenshot for ${name}: ${err.message}`);
            }
        }
    }

    console.log('Synchronization complete!');
}

sync().catch(console.error);
