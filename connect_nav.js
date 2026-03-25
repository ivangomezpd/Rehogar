const fs = require('fs');
const path = require('path');

const SCREENS_DIR = 'C:/Users/igomez/.gemini/antigravity/scratch/Rehogar/screens';

const screens = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

let modifiedCount = 0;

for (const screen of screens) {
    const htmlPath = path.join(SCREENS_DIR, screen, 'code.html');
    if (!fs.existsSync(htmlPath)) continue;

    let html = fs.readFileSync(htmlPath, 'utf8');
    let originalHtml = html;

    const navRegex = /<a([^>]*?)href=["']#["']([^>]*?)>([\s\S]*?)<p([^>]*)>(Inicio|Favoritos|Mensajes|Perfil)<\/p>/g;
    
    html = html.replace(navRegex, (match, p1, p2, inner, pAttr, name) => {
        let target = '#';
        if (name === 'Inicio') target = '/screens-static/explorar_casas/code.html';
        else if (name === 'Favoritos') target = '/screens-static/mis_favoritos/code.html';
        else if (name === 'Mensajes') target = '/screens-static/mensajes_y_afinidad/code.html';
        else if (name === 'Perfil') target = '/screens-static/perfil_de_usuario_con_rol_diferenciado/code.html';
        
        return `<a${p1}href="${target}"${p2}>${inner}<p${pAttr}>${name}</p>`;
    });

    if (html !== originalHtml) {
        fs.writeFileSync(htmlPath, html, 'utf8');
        modifiedCount++;
        console.log(`Updated nav links in: ${screen}`);
    }
}

console.log(`\nUpdated navigation links in ${modifiedCount} screens.`);
