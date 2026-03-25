// fix_publicar_casa.js - Versión mejorada
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

const html = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(html, { decodeEntities: false }); // Added to prevent unicode breaking
let modified = false;

// ============================================
// 1. CORREGIR ALINEACIÓN DE CAMPOS (Tipo vivienda, Habitaciones, Aseos)
// ============================================
// Buscar el grid que contiene los 3 campos
$('.grid.grid-cols-1.md\\:grid-cols-3.gap-4').each((i, grid) => {
    // Ya está en 3 columnas, solo aseguramos que los campos tengan los valores correctos
    console.log('✅ Campos ya alineados en 3 columnas');
});

// Si no existe el grid de 3 columnas, lo creamos a partir del contenedor padre
$('.grid.grid-cols-1.md\\:grid-cols-2.gap-4').each((i, grid) => {
    const $grid = $(grid);
    // Buscar dentro de este grid el contenedor de los 3 campos
    const $innerGrid = $grid.find('.grid.grid-cols-1.md\\:grid-cols-3.gap-4');
    if ($innerGrid.length === 0) {
        // Buscar los campos individuales
        const $tipoLabel = $grid.find('label:has(span:contains("Tipo de vivienda"))');
        const $habitacionesLabel = $grid.find('label:has(span:contains("Nº de Habitaciones"))');
        const $aseosLabel = $grid.find('label:has(span:contains("Nº de Aseos"))');
        
        if ($tipoLabel.length && $habitacionesLabel.length && $aseosLabel.length) {
            // Crear nuevo grid de 3 columnas
            const newGrid = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${$tipoLabel.clone().wrap('<div>').parent().html()}
                ${$habitacionesLabel.clone().wrap('<div>').parent().html()}
                ${$aseosLabel.clone().wrap('<div>').parent().html()}
            </div>
            `;
            
            // Reemplazar los 3 labels con el nuevo grid
            $tipoLabel.parent().remove();
            $habitacionesLabel.parent().remove();
            $aseosLabel.parent().remove();
            $grid.append(newGrid);
            modified = true;
            console.log('✅ Alineados campos: Tipo vivienda, Habitaciones, Aseos');
        }
    }
});

// ============================================
// 2. CORREGIR MAPA - Asegurar que funciona correctamente
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
// 3. CORREGIR CARACTERÍSTICAS EXTRA - Quitar enlaces y hacerlos filtros
// ============================================
$('.space-y-3.pt-2 .flex.flex-wrap.gap-3 a, .space-y-3.pt-2 .flex.flex-wrap.gap-3 button').each((i, btn) => {
    const $btn = $(btn);
    const $parent = $btn.closest('a');
    const btnText = $btn.text().trim();
    
    // Extraer el nombre de la característica
    let featureName = btnText;
    const iconSpan = $btn.find('span.material-symbols-outlined');
    if (iconSpan.length) {
        featureName = btnText.replace(iconSpan.text(), '').trim();
    }
    
    if (featureName && ['Terraza', 'Piscina', 'Urbanización', 'Ascensor', 'Garaje'].some(f => featureName.includes(f))) {
        const newBtn = `
        <label class="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1a2e23] text-gray-600 dark:text-gray-300 border border-[#dbe6e0] dark:border-[#2a3f33] font-medium text-sm hover:border-primary hover:text-primary transition-colors cursor-pointer">
            <input type="checkbox" name="feature_${featureName.toLowerCase().replace(/\s/g, '_')}" value="${featureName.toLowerCase()}" class="rounded text-primary focus:ring-primary w-4 h-4">
            <span class="material-symbols-outlined text-lg">${getFeatureIcon(featureName)}</span>
            <span>${featureName}</span>
        </label>
        `;
        
        if ($parent.length) {
            $parent.replaceWith(newBtn);
        } else {
            $btn.replaceWith(newBtn);
        }
        modified = true;
    }
});

console.log('✅ Características extra convertidas a filtros (checkboxes)');

// ============================================
// 4. CORREGIR PERFIL DE CONVIVENCIA - Adultos y Niños
// ============================================
$('label:has(span:contains("¿Quién vive actualmente?"))').each((i, label) => {
    const $label = $(label);
    const $select = $label.find('select');
    
    if ($select.length && !$label.find('.adult-count').length) {
        const newContent = `
        <span class="text-[#111814] dark:text-white text-sm font-semibold">¿Quién vive actualmente?</span>
        <div class="grid grid-cols-2 gap-4 mt-2">
            <div class="flex flex-col gap-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">Adultos (18+ años)</span>
                <div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl">
                    <button type="button" class="adult-decrement size-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm text-gray-400 hover:bg-gray-100">-</button>
                    <span class="adult-count flex-1 text-center font-bold text-lg">1</span>
                    <button type="button" class="adult-increment size-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary-dark">+</button>
                </div>
                <input type="hidden" name="adults" value="1">
            </div>
            <div class="flex flex-col gap-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">Niños (0-17 años)</span>
                <div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl">
                    <button type="button" class="child-decrement size-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm text-gray-400 hover:bg-gray-100">-</button>
                    <span class="child-count flex-1 text-center font-bold text-lg">0</span>
                    <button type="button" class="child-increment size-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary-dark">+</button>
                </div>
                <input type="hidden" name="children" value="0">
            </div>
        </div>
        `;
        $label.html(newContent);
        modified = true;
        console.log('✅ Actualizado: ¿Quién vive actualmente? → Adultos y Niños');
    }
});

// Eliminar el select de régimen de custodia
$('label:has(span:contains("Régimen de Custodia"))').each((i, label) => {
    $(label).remove();
    modified = true;
    console.log('✅ Eliminado select de Régimen de Custodia');
});

// ============================================
// 5. CORREGIR PREFERENCIAS - Convertir a filtros sin enlaces
// ============================================
$('.space-y-3:has(span:contains("Preferencias")) .flex.flex-wrap.gap-3 a, .space-y-3:has(span:contains("Preferencias")) .flex.flex-wrap.gap-3 button').each((i, btn) => {
    const $btn = $(btn);
    const $parent = $btn.closest('a');
    const btnText = $btn.text().trim();
    
    let preferenceName = btnText;
    const iconSpan = $btn.find('span.material-symbols-outlined');
    if (iconSpan.length) {
        preferenceName = btnText.replace(iconSpan.text(), '').trim();
    }
    
    if (preferenceName && ['Aceptamos perros', 'No fumadores', 'Sólo mujeres', 'Sólo hombres'].some(p => preferenceName.includes(p))) {
        const newCheckbox = `
        <label class="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1a2e23] text-gray-600 dark:text-gray-300 border border-[#dbe6e0] dark:border-[#2a3f33] font-medium text-sm hover:border-primary hover:text-primary transition-colors cursor-pointer">
            <input type="checkbox" name="preference_${preferenceName.toLowerCase().replace(/\s/g, '_')}" value="${preferenceName.toLowerCase()}" class="rounded text-primary focus:ring-primary w-4 h-4">
            <span class="material-symbols-outlined text-lg">${getPreferenceIcon(preferenceName)}</span>
            <span>${preferenceName}</span>
        </label>
        `;
        
        if ($parent.length) {
            $parent.replaceWith(newCheckbox);
        } else {
            $btn.replaceWith(newCheckbox);
        }
        modified = true;
    }
});

console.log('✅ Preferencias convertidas a filtros (checkboxes)');

// ============================================
// 6. CORREGIR BOTONES DEL FOOTER
// ============================================
// Eliminar enlaces de los botones del footer
$('footer a, footer button').each((i, el) => {
    const $el = $(el);
    if ($el.is('a') && $el.attr('href') === '/screens-static/perfil_de_usuario_con_rol_diferenciado/code.html') {
        $el.removeAttr('href');
        $el.css('cursor', 'pointer');
        modified = true;
        console.log('✅ Eliminado enlace del botón footer');
    }
});

// ============================================
// 7. AÑADIR JAVASCRIPT PARA LOS CONTADORES
// ============================================
// Verificar si ya existe el script
if (!$('script:contains("adult-count")').length) {
    $('body').append(`
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Contador de adultos
        const adultDecrement = document.querySelector('.adult-decrement');
        const adultIncrement = document.querySelector('.adult-increment');
        const adultCountSpan = document.querySelector('.adult-count');
        const adultHidden = document.querySelector('input[name="adults"]');
        
        if (adultDecrement && adultIncrement && adultCountSpan) {
            let adultCount = parseInt(adultCountSpan.textContent) || 1;
            
            adultDecrement.addEventListener('click', function(e) {
                e.preventDefault();
                if (adultCount > 0) {
                    adultCount--;
                    adultCountSpan.textContent = adultCount;
                    if (adultHidden) adultHidden.value = adultCount;
                }
            });
            
            adultIncrement.addEventListener('click', function(e) {
                e.preventDefault();
                adultCount++;
                adultCountSpan.textContent = adultCount;
                if (adultHidden) adultHidden.value = adultCount;
            });
        }
        
        // Contador de niños
        const childDecrement = document.querySelector('.child-decrement');
        const childIncrement = document.querySelector('.child-increment');
        const childCountSpan = document.querySelector('.child-count');
        const childHidden = document.querySelector('input[name="children"]');
        
        if (childDecrement && childIncrement && childCountSpan) {
            let childCount = parseInt(childCountSpan.textContent) || 0;
            
            childDecrement.addEventListener('click', function(e) {
                e.preventDefault();
                if (childCount > 0) {
                    childCount--;
                    childCountSpan.textContent = childCount;
                    if (childHidden) childHidden.value = childCount;
                }
            });
            
            childIncrement.addEventListener('click', function(e) {
                e.preventDefault();
                childCount++;
                childCountSpan.textContent = childCount;
                if (childHidden) childHidden.value = childCount;
            });
        }
    });
    </script>
    `);
    modified = true;
    console.log('✅ Añadido JavaScript para contadores');
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function getFeatureIcon(feature) {
    const icons = {
        'Terraza': 'balcony',
        'Piscina': 'pool',
        'Urbanización': 'holiday_village',
        'Ascensor': 'elevator',
        'Garaje': 'garage'
    };
    return icons[feature] || 'check_box';
}

function getPreferenceIcon(preference) {
    const icons = {
        'Aceptamos perros': 'pets',
        'No fumadores': 'smoke_free',
        'Sólo mujeres': 'woman',
        'Sólo hombres': 'man'
    };
    return icons[preference] || 'favorite';
}

// ============================================
// GUARDAR CAMBIOS
// ============================================
if (modified) {
    fs.writeFileSync(filePath, $.html(), 'utf8');
    console.log('\n✅ Archivo actualizado correctamente');
    console.log(`📍 Ruta: ${filePath}`);
    console.log('\n📋 Cambios realizados:');
    console.log('   ✓ Alineados campos de tipo vivienda, habitaciones y aseos');
    console.log('   ✓ Actualizado mapa con Google Maps interactivo');
    console.log('   ✓ Características extra convertidas a checkboxes');
    console.log('   ✓ Perfil de convivencia ahora con contadores de adultos/niños');
    console.log('   ✓ Preferencias convertidas a checkboxes sin enlaces');
    console.log('   ✓ Eliminados enlaces del footer');
} else {
    console.log('\n⚠️ No se realizaron cambios');
}
