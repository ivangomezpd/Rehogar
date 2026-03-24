const fs = require('fs');
const path = require('path');

const SCREENS_DIR = 'C:/Users/igomez/.gemini/antigravity/scratch/Rehogar/screens';

function normalize(str) {
    const res = str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
    return res;
}

function getBaseName(dir) {
    const normalized = normalize(dir);
    const match = normalized.match(/^(.*)_[0-9a-f]{4}$/);
    if (match) return match[1];
    return normalized;
}

const dirs = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

console.log('--- Directory Normalization Test ---');
const groups = {};
dirs.forEach(name => {
    const norm = normalize(name);
    const base = getBaseName(name);
    console.log(`Original: "${name}" | Normalized: "${norm}" | Base: "${base}"`);
    
    if (!groups[base]) groups[base] = [];
    groups[base].push(name);
});

console.log('\n--- Duplicate Groups ---');
const toDelete = [];
for (const base in groups) {
    if (groups[base].length > 1) {
        console.log(`Group "${base}":`, groups[base]);
        // Keep the one that matches 'base' exactly if available, otherwise keep the first one.
        let best = groups[base].find(n => n === base) || groups[base][0];
        console.log(`  Best to keep: ${best}`);
        groups[base].forEach(n => {
            if (n !== best) toDelete.push(n);
        });
    }
}

console.log('\n--- Actions ---');
toDelete.forEach(name => {
    const fullPath = path.join(SCREENS_DIR, name);
    console.log(`Deleting: ${name}`);
    try {
        fs.rmSync(fullPath, { recursive: true, force: true });
    } catch (e) {
        console.error(`Error deleting ${name}: ${e.message}`);
    }
});

console.log('Done.');
