// fix_onboarding_complete.js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const filePath = path.join(__dirname, 'screens', 'seleccion_de_rol', 'code.html');

if (!fs.existsSync(filePath)) {
    console.log('❌ Archivo no encontrado');
    process.exit(1);
}

const html = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(html);
let modified = false;

// ============================================
// FUNCIÓN: Envolver elemento con <a>
// ============================================
function wrapWithLink($, element, targetUrl) {
    const $el = $(element);
    const htmlContent = $el.html();
    const classes = $el.attr('class') || '';
    const styles = $el.attr('style') || '';
    
    const $anchor = $(`<a href="${targetUrl}" class="${classes}" style="${styles}">${htmlContent}</a>`);
    
    const attrs = $el.prop('attributes');
    if (attrs) {
        for (let attr of attrs) {
            if (attr.name !== 'class' && attr.name !== 'style') {
                $anchor.attr(attr.name, attr.value);
            }
        }
    }
    $el.replaceWith($anchor);
    return true;
}

// ============================================
// 1. ELIMINAR EL BOTÓN "Continue" (ya no es necesario)
// ============================================
$('button:contains("Continue"), button:contains("Continuar")').each((i, btn) => {
    const $btn = $(btn);
    const $parent = $btn.closest('.flex, .mt-auto, footer');
    if ($parent.length) {
        $parent.remove();
        console.log('✅ Eliminado botón "Continue"');
        modified = true;
    }
});

// ============================================
// 2. PROCESAR PRIMERA TARJETA (I have a room/house to share)
// ============================================
const targetHost = '/screens-static/publicar_casa_con_custodia/code.html';

// Buscar la primera tarjeta por texto
$('.group.cursor-pointer, .group:has(p:contains("room/house to share")), .group:has(p:contains("room"))').each((i, card) => {
    const $card = $(card);
    const cardText = $card.text().toLowerCase();
    
    if (cardText.includes('room/house to share') || cardText.includes('room to share') || (i === 0 && cardText.includes('share'))) {
        if (!$card.closest('a').length) {
            // Envolver toda la tarjeta
            wrapWithLink($, card, targetHost);
            modified = true;
            console.log('✅ Enlazada tarjeta: I have a room/house to share');
        } else {
            // Si ya está envuelta, solo actualizar href
            const $parentLink = $card.closest('a');
            if ($parentLink.length) {
                $parentLink.attr('href', targetHost);
                modified = true;
                console.log('✅ Actualizado enlace: I have a room/house to share');
            }
        }
    }
});

// ============================================
// 3. PROCESAR SEGUNDA TARJETA (I am looking for a home)
// ============================================
const targetSeeker = '/screens-static/explorar_casas/code.html';

$('.group.cursor-pointer, .group:has(p:contains("looking for a home")), .group:has(p:contains("looking"))').each((i, card) => {
    const $card = $(card);
    const cardText = $card.text().toLowerCase();
    
    if (cardText.includes('looking for a home') || cardText.includes('looking for a room') || (i === 1 && cardText.includes('browse'))) {
        if (!$card.closest('a').length) {
            wrapWithLink($, card, targetSeeker);
            modified = true;
            console.log('✅ Enlazada tarjeta: I am looking for a home');
        } else {
            const $parentLink = $card.closest('a');
            if ($parentLink.length) {
                $parentLink.attr('href', targetSeeker);
                modified = true;
                console.log('✅ Actualizado enlace: I am looking for a home');
            }
        }
    }
});

// ============================================
// 4. ASEGURAR QUE EL BOTÓN VERDE NO QUEDE SUELTO
// ============================================
// Buscar botones verdes dentro de las tarjetas y eliminarlos
// o asegurar que están envueltos en el mismo enlace
$('.bg-primary.rounded-full, button:has(span:contains("chevron_right"))').each((i, btn) => {
    const $btn = $(btn);
    // Si el botón está dentro de una tarjeta que ya tiene enlace, lo eliminamos
    const $parentCard = $btn.closest('.group, .group.cursor-pointer, a');
    if ($parentCard.length && $parentCard.is('a')) {
        // Eliminar el botón para evitar doble navegación
        $btn.remove();
        modified = true;
        console.log('✅ Eliminado botón verde redundante');
    }
});

// ============================================
// 5. ELIMINAR CUALQUIER BOTÓN "Continue" RESIDUAL
// ============================================
$('button:contains("Continue"), button:contains("Continuar"), .mt-auto button, footer button').each((i, btn) => {
    const $btn = $(btn);
    if ($btn.text().includes('Continue') || $btn.text().includes('Continuar')) {
        const $parent = $btn.closest('div, footer');
        if ($parent.length) {
            $parent.remove();
            modified = true;
            console.log('✅ Eliminado botón Continue residual');
        } else {
            $btn.remove();
            modified = true;
        }
    }
});

// ============================================
// GUARDAR CAMBIOS
// ============================================
if (modified) {
    fs.writeFileSync(filePath, $.html(), 'utf8');
    console.log('\n✅ Archivo actualizado correctamente');
    console.log('📍 Ruta: ' + filePath);
} else {
    console.log('\n⚠️ No se realizaron cambios. Verifica que el archivo existe y tiene la estructura esperada.');
}
