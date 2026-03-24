const fs = require('fs');
const path = require('path');

const SCREENS_DIR = 'C:/Users/igomez/.gemini/antigravity/scratch/Rehogar/screens';

function normalize(str) {
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s_]/g, '') // preserved underscores
        .trim()
        .replace(/\s+/g, '_');
}

function getBaseName(dir) {
    const normalized = normalize(dir);
    // Matches names like "some_screen_name_1234" where 1234 is 4 hex chars
    const match = normalized.match(/^(.*)_[0-9a-f]{4}$/);
    if (match) return match[1];
    return normalized;
}

const dirs = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({
        name: d.name,
        mtime: fs.statSync(path.join(SCREENS_DIR, d.name)).mtime.getTime()
    }));

const groups = {};
dirs.forEach(d => {
    const base = getBaseName(d.name);
    if (!groups[base]) groups[base] = [];
    groups[base].push(d);
});

const toDelete = [];

for (const base in groups) {
    const list = groups[base];
    if (list.length > 1) {
        console.log(`Found group "${base}":`, list.map(x => x.name));
        // Priority: 
        // 1. One that matches the base name exactly (unaccented, no suffix) if it exists.
        // 2. Otherwise, the newest one.
        
        let best = list[0];
        // Sort by mtime descending first
        list.sort((a, b) => b.mtime - a.mtime);
        
        // Check if any matches the base exactly
        const exact = list.find(x => x.name === base);
        if (exact) {
            best = exact;
        } else {
            best = list[0]; // Newest
        }

        console.log(`  Keeping: ${best.name}`);
        list.forEach(item => {
            if (item.name !== best.name) {
                toDelete.push(item.name);
            }
        });
    }
}

console.log(`\nDeleting ${toDelete.length} redundant screen directories...`);

toDelete.forEach(name => {
    const fullPath = path.join(SCREENS_DIR, name);
    try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`  Deleted: ${name}`);
    } catch (e) {
        console.error(`  Error deleting ${name}: ${e.message}`);
    }
});

console.log('Cleanup complete!');
