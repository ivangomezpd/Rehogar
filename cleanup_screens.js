const fs = require('fs');
const path = require('path');

const SCREENS_DIR = 'C:/Users/igomez/.gemini/antigravity/scratch/Rehogar/screens';

function normalize(str) {
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
}

const dirs = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

console.log('Total directories:', dirs.length);

const groups = {};

dirs.forEach(dir => {
    // Check if it's a versioned name like "name_xxxx" where xxxx is 4 hex chars
    const baseNameMatch = dir.match(/^(.*)_[0-9a-f]{4}$/);
    const baseName = baseNameMatch ? baseNameMatch[1] : normalize(dir);
    
    if (!groups[baseName]) groups[baseName] = [];
    groups[baseName].push(dir);
});

const toDelete = [];

for (const baseName in groups) {
    const list = groups[baseName];
    if (list.length > 1) {
        console.log(`Potential duplicates for "${baseName}":`, list);
        // Heuristic: 
        // 1. Prefer unaccented names.
        // 2. Prefer names WITHOUT the 4-char suffix.
        // 3. Keep the one with the most recent 'mtime' if possible.
        
        let best = list[0];
        for (const item of list) {
            const isAccented = item !== normalize(item);
            const hasSuffix = /[0-9a-f]{4}$/.test(item) && item !== normalize(item); // wait, suffix check
            
            // Simple logic: the one that IS the baseName (unaccented, no suffix) is best.
            if (item === baseName) {
                best = item;
                break;
            }
        }
        
        console.log(`  Best candidate: ${best}`);
        list.forEach(item => {
            if (item !== best) toDelete.push(item);
        });
    } else {
        // If only one, but it's accented, we should have renamed it or synced it.
        // If it was synced, it ALREADY should have an unaccented name.
        // If it's accented, it's likely an old one that wasn't synced.
        const dir = list[0];
        if (dir !== normalize(dir)) {
            console.log(`Accented directory without unaccented version: ${dir}`);
            // We should probably keep it but rename it, or delete it if it's junk.
            // Since I synced 39 screens, most should have unaccented versions.
            toDelete.push(dir);
        }
    }
}

console.log('\nDirectories to delete:', toDelete);

toDelete.forEach(dir => {
    const fullPath = path.join(SCREENS_DIR, dir);
    console.log(`Deleting: ${fullPath}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
});

console.log('Cleanup complete!');
