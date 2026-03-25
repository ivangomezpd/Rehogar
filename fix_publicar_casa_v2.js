// fix_publicar_casa_v2.js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Detectar directorio correcto
let screensDir = '';
if (fs.existsSync(path.join(__dirname, 'screens-static'))) {
    screensDir = 'screens-static';
} else if (fs.existsSync(path.join(__dirname, 'screens'))) {
    screensDir = 'screens';
} else {
    console.error('❌ No se encontró el directorio');
    process.exit(1);
}

const filePath = path.join(__dirname, screensDir, 'publicar_casa_con_custodia', 'code.html');

if (!fs.existsSync(filePath)) {
    console.log(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
}

console.log(`📍 Procesando: ${filePath}\n`);

// LEER el archivo HTML original
let html = fs.readFileSync(filePath, 'utf8');

// Verificar que es HTML y no el script
if (html.includes('const fs = require')) {
    console.error('❌ ERROR: El archivo HTML fue sobrescrito con el script');
    console.log('💡 Debes restaurar el HTML original antes de continuar');
    process.exit(1);
}

const $ = cheerio.load(html, { decodeEntities: false });
let modified = false;

// ============================================
// 1. CORREGIR MAPA - Reemplazar imagen estática con iframe
// ============================================
$('.rounded-xl.overflow-hidden.h-40.w-full.relative').each((i, mapContainer) => {
    const $map = $(mapContainer);
    const hasIframe = $map.find('iframe').length;
    
    if (!hasIframe) {
        const newMap = `
        <div class="rounded-xl overflow-hidden h-40 w-full relative border border-[#dbe6e0] dark:border-[#2a3f33]">
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                style="border:0"
                src="https://www.google.com/maps/embed/v1/search?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbV6arttYQ&q=Madrid+Spain"
                allowfullscreen>
            </iframe>
            <div class="absolute bottom-2 right-2 bg-white dark:bg-[#1a2e23] px-2 py-1 rounded-lg text-xs shadow-md">
                <span class="material-symbols-outlined text-primary text-sm align-middle">edit_location</span>
                <span class="text-xs font-medium">Haz clic para seleccionar ubicación</span>
            </div>
        </div>
        `;
        $map.replaceWith(newMap);
        modified = true;
        console.log('✅ Actualizado mapa con Google Maps interactivo');
    }
});

// ============================================
// 2. CORREGIR CARACTERÍSTICAS EXTRA - Quitar enlaces
// ============================================
$('.space-y-3.pt-2 .flex.flex-wrap.gap-3 a').each((i, link) => {
    const $link = $(link);
    const $btn = $link.find('button');
    if ($btn.length) {
        // Extraer el contenido del botón
        const btnHtml = $btn.html();
        const btnClass = $btn.attr('class') || '';
        const featureName = $btn.text().trim();
        
        // Reemplazar el enlace con el botón directamente
        const newButton = `<button class="${btnClass}">${btnHtml}</button>`;
        $link.replaceWith(newButton);
        modified = true;
    }
});

console.log('✅ Eliminados enlaces de características extra');

// ============================================
// 3. CORREGIR PREFERENCIAS - Quitar enlaces
// ============================================
$('.space-y-3:has(span:contains("Preferencias")) .flex.flex-wrap.gap-3 a').each((i, link) => {
    const $link = $(link);
    const $btn = $link.find('button');
    if ($btn.length) {
        const btnHtml = $btn.html();
        const btnClass = $btn.attr('class') || '';
        $link.replaceWith(`<button class="${btnClass}">${btnHtml}</button>`);
        modified = true;
    }
});

console.log('✅ Eliminados enlaces de preferencias');

// ============================================
// 4. CORREGIR BOTONES DEL FOOTER
// ============================================
$('footer a').each((i, link) => {
    const $link = $(link);
    const $btn = $link.find('button');
    if ($btn.length) {
        const btnHtml = $btn.html();
        const btnClass = $btn.attr('class') || '';
        $link.replaceWith(`<button class="${btnClass}">${btnHtml}</button>`);
        modified = true;
    }
});

console.log('✅ Eliminados enlaces del footer');

// ============================================
// GUARDAR CAMBIOS
// ============================================
if (modified) {
    const newHtml = $.html();
    fs.writeFileSync(filePath, newHtml, 'utf8');
    console.log('\n✅ Archivo actualizado correctamente');
    console.log(`📍 Ruta: ${filePath}`);
} else {
    console.log('\n⚠️ No se realizaron cambios');
}
