const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SCREENS_DIR = path.join(__dirname, 'screens');
const BASE_URL = '/screens-static';

const screens = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

const report = {};

for (const screen of screens) {
    const htmlPath = path.join(SCREENS_DIR, screen, 'code.html');
    if (!fs.existsSync(htmlPath)) continue;

    const html = fs.readFileSync(htmlPath, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });

    const links = [];
    const brokenLinks = [];

    // Find all <a> tags
    $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().replace(/\s+/g, ' ').trim().substring(0, 80);
        const isLinked = href && href !== '#' && href !== '';
        const target = href.match(/screens-static\/([^/]+)\//)?.[1] || null;
        links.push({ type: 'a', text, href, isLinked, target });
        if (!isLinked) brokenLinks.push({ type: 'a', text });
    });

    // Find all buttons with onclick
    $('button').each((i, el) => {
        const onclick = $(el).attr('onclick') || '';
        const text = $(el).text().replace(/\s+/g, ' ').trim().substring(0, 80);
        const parent = $(el).closest('a');
        const parentHref = parent.attr('href') || '';
        const isLinked = !!onclick || (parentHref && parentHref !== '#');
        if (!onclick && !parentHref) {
            brokenLinks.push({ type: 'button', text });
        }
    });

    // Find profile icon (rounded img at top)
    const profileImgAtTop = $('header img, header .rounded-full').first();
    const profileParent = profileImgAtTop.closest('a');
    if (profileImgAtTop.length && !profileParent.length) {
        brokenLinks.push({ type: 'profile-icon', text: '[Avatar / Foto de perfil en header]' });
    }

    const linkedScreens = [...new Set(links.filter(l => l.target).map(l => l.target))];

    report[screen] = {
        totalLinks: links.length,
        brokenCount: brokenLinks.length,
        brokenLinks,
        linkedScreens
    };
}

// Output report
console.log('=== REHOGAR NAVIGATION AUDIT ===\n');
let totalBroken = 0;
const connectivity = {};

for (const [screen, data] of Object.entries(report)) {
    connectivity[screen] = data.linkedScreens;
    console.log(`\n📱 ${screen}`);
    console.log(`  Links totales: ${data.totalLinks} | Sin enlazar: ${data.brokenCount}`);
    if (data.brokenLinks.length > 0) {
        console.log(`  ❌ Botones/links sin enlazar:`);
        data.brokenLinks.forEach(b => console.log(`     - [${b.type}] "${b.text}"`));
        totalBroken += data.brokenLinks.length;
    } else {
        console.log(`  ✅ Todos los elementos están enlazados`);
    }
    if (data.linkedScreens.length > 0) {
        console.log(`  🔗 Conecta con: ${data.linkedScreens.join(', ')}`);
    }
}

console.log(`\n\n=== RESUMEN ===`);
console.log(`Total pantallas: ${screens.length}`);
console.log(`Total botones sin enlazar: ${totalBroken}`);
console.log(`\n\n=== CONNECTIVITY JSON (para el mapa visual) ===`);
console.log(JSON.stringify(connectivity, null, 2));
