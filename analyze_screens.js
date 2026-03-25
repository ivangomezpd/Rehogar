const fs = require('fs');
const path = require('path');

const SCREENS_DIR = 'C:/Users/igomez/.gemini/antigravity/scratch/Rehogar/screens';

const screens = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

console.log(`Found ${screens.length} screens:\n`);

const results = {};

for (const screen of screens) {
    const htmlPath = path.join(SCREENS_DIR, screen, 'code.html');
    const screenshotPath = path.join(SCREENS_DIR, screen, 'screen.png');
    
    const hasHtml = fs.existsSync(htmlPath);
    const hasScreenshot = fs.existsSync(screenshotPath);
    
    let links = [];
    let internalLinks = [];
    let brokenLinks = [];
    
    if (hasHtml) {
        const html = fs.readFileSync(htmlPath, 'utf8');
        // Find all href links
        const hrefMatches = [...html.matchAll(/href=["']([^"'#][^"']*)["']/g)];
        links = hrefMatches.map(m => m[1]).filter(l => !l.startsWith('http') && !l.startsWith('mailto'));
        
        // Find links to other screens (relative paths starting with '../' or '/screens-static/')
        internalLinks = hrefMatches.map(m => m[1])
            .filter(l => l.includes('screens-static') || l.includes('../'));
        
        // Check for onclick window.location patterns too
        const locationMatches = [...html.matchAll(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/g)];
        const jsLinks = locationMatches.map(m => m[1]);
        internalLinks = [...new Set([...internalLinks, ...jsLinks.filter(l => l.includes('screens-static') || l.includes('../'))])];
        
        // Check if linked screens exist
        for (const link of internalLinks) {
            // Extract screen name from link
            const match = link.match(/screens-static\/([^\/]+)/);
            if (match) {
                const linkedScreen = match[1];
                if (!screens.includes(linkedScreen)) {
                    brokenLinks.push({ link, linkedScreen });
                }
            }
        }
    }
    
    results[screen] = { hasHtml, hasScreenshot, internalLinks, brokenLinks };
    
    const status = hasHtml ? '✓ HTML' : '✗ NO HTML';
    const imgStatus = hasScreenshot ? '✓ IMG' : '✗ NO IMG';
    console.log(`${screen}`);
    console.log(`  [${status}] [${imgStatus}]`);
    if (internalLinks.length > 0) {
        console.log(`  Navigation links (${internalLinks.length}):`);
        internalLinks.forEach(l => console.log(`    -> ${l}`));
    } else {
        console.log(`  Navigation links: none`);
    }
    if (brokenLinks.length > 0) {
        console.log(`  ⚠ BROKEN LINKS:`);
        brokenLinks.forEach(b => console.log(`    BROKEN -> ${b.linkedScreen} (${b.link})`));
    }
    console.log('');
}

// Summary
const noHtml = screens.filter(s => !results[s].hasHtml);
const noScreenshot = screens.filter(s => !results[s].hasScreenshot);
const withBroken = screens.filter(s => results[s].brokenLinks.length > 0);
const noLinks = screens.filter(s => results[s].internalLinks.length === 0);

console.log('=== SUMMARY ===');
console.log(`Total screens: ${screens.length}`);
console.log(`Missing HTML: ${noHtml.length > 0 ? noHtml.join(', ') : 'none'}`);
console.log(`Missing screenshot: ${noScreenshot.length > 0 ? noScreenshot.join(', ') : 'none'}`);
console.log(`Broken links: ${withBroken.length > 0 ? withBroken.join(', ') : 'none'}`);
console.log(`No navigation links: ${noLinks.length > 0 ? noLinks.join(', ') : 'none'}`);
