// link_all_screens_deep.js - Versión Fusionada (Mantenibilidad + Robustez)
// Ejecutar con: node link_all_screens_deep.js

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // npm install cheerio

// ============================================
// CONFIGURACIÓN DE RUTAS
// ============================================
const SCREENS_DIR = path.join(__dirname, 'screens'); // Corregido el directorio
if (!fs.existsSync(SCREENS_DIR)) {
    console.error(`❌ Directorio no encontrado: ${SCREENS_DIR}`);
    console.log('💡 ¿Quisiste usar "screens-static" en lugar de "screens"?');
    process.exit(1);
}
const BASE_URL = '/screens-static'; // Prefijo dinámico Express

const getUrl = (screenName) => `${BASE_URL}/${screenName}/code.html`;

const SCREENS = [
    'explorar_casas',
    'busqueda_avanzada_con_custodia',
    'detalle_de_la_casa',
    'mapa_interactivo_de_casas',
    'mapa_con_zonas_escolares',
    'calendario_compartido',
    'mensajes_y_afinidad',
    'mis_favoritos',
    'mis_visitas',
    'configuracion_de_notificaciones',
    'perfil_de_usuario_con_rol_diferenciado',
    'onboarding_de_la_app',
    'seleccion_de_rol',
    'planes_de_suscripcion',
    'publicar_casa_con_custodia',
    'verificacion_de_identidad'
];

// ============================================
// MAPEO DE NAVEGACIÓN (PANTALLA PADRE -> DESTINO)
// ============================================
const navigationMap = {
    'explorar_casas': {
        parent: null,
        links: {
            'Solo hombres': getUrl('busqueda_avanzada_con_custodia'),
            'Solo mujeres': getUrl('busqueda_avanzada_con_custodia'),
            'Mascotas: Sí': getUrl('busqueda_avanzada_con_custodia'),
            'No mascotas': getUrl('busqueda_avanzada_con_custodia'),
            'Ver mapa': getUrl('mapa_interactivo_de_casas'),
            'Favoritos': getUrl('mis_favoritos'),
            'Mensajes': getUrl('mensajes_y_afinidad'),
            'Perfil': getUrl('perfil_de_usuario_con_rol_diferenciado'),
            'notifications': getUrl('configuracion_de_notificaciones'),
            'tune': getUrl('busqueda_avanzada_con_custodia'),
            'search': getUrl('busqueda_avanzada_con_custodia')
        },
        cards: { selector: '.group.relative', target: getUrl('detalle_de_la_casa') }
    },
    'busqueda_avanzada_con_custodia': {
        parent: 'explorar_casas',
        links: {
            'arrow_back': getUrl('explorar_casas'),
            'close': getUrl('explorar_casas'),
            'Aplicar filtros': getUrl('explorar_casas'),
            'Limpiar': '#',
            'Apartamento': '#', 'Casa': '#', 'Chalet': '#', 'Estudio': '#'
        }
    },
    'detalle_de_la_casa': {
        parent: 'explorar_casas',
        links: {
            'arrow_back': getUrl('explorar_casas'),
            'share': '#',
            'Contactar': getUrl('mensajes_y_afinidad'),
            'Solicitar visita': getUrl('calendario_compartido')
        }
    },
    'mapa_interactivo_de_casas': {
        parent: 'explorar_casas',
        links: {
            'arrow_back': getUrl('explorar_casas'),
            'tune': getUrl('busqueda_avanzada_con_custodia'),
            'List View': getUrl('explorar_casas'),
            'my_location': '#',
            'school': getUrl('mapa_con_zonas_escolares')
        },
        markers: { selector: '.absolute.cursor-pointer', target: getUrl('detalle_de_la_casa') }
    },
    'mapa_con_zonas_escolares': {
        parent: 'mapa_interactivo_de_casas',
        links: { 'arrow_back': getUrl('mapa_interactivo_de_casas') }
    },
    'calendario_compartido': {
        parent: 'mis_visitas',
        links: {
            'arrow_back': getUrl('mis_visitas'),
            'add': '#', 'chevron_left': '#', 'chevron_right': '#',
            'Inicio': getUrl('explorar_casas'),
            'Mensajes': getUrl('mensajes_y_afinidad'),
            'Ajustes': getUrl('configuracion_de_notificaciones')
        }
    },
    'mensajes_y_afinidad': {
        parent: 'explorar_casas',
        links: {
            'arrow_back': getUrl('explorar_casas'),
            'menu': getUrl('explorar_casas'),
            'Home': getUrl('explorar_casas'),
            'Matches': getUrl('mis_favoritos'),
            'Messages': '#',
            'Profile': getUrl('perfil_de_usuario_con_rol_diferenciado'),
            'edit_square': getUrl('explorar_casas'),
            'close': '#'
        }
    },
    'mis_favoritos': {
        parent: 'explorar_casas',
        links: {
            'arrow_back': getUrl('explorar_casas'),
            'more_vert': '#', 'favorite': '#',
            'Ver Detalles': getUrl('detalle_de_la_casa'),
            'Explorar': getUrl('explorar_casas'),
            'Mensajes': getUrl('mensajes_y_afinidad'),
            'Perfil': getUrl('perfil_de_usuario_con_rol_diferenciado')
        },
        cards: { selector: '.bg-white.rounded-xl', target: getUrl('detalle_de_la_casa') }
    },
    'mis_visitas': {
        parent: 'explorar_casas',
        links: {
            'arrow_back': getUrl('explorar_casas'),
            'notifications': getUrl('configuracion_de_notificaciones'),
            'Cancelar': '#',
            'Cambiar fecha': getUrl('calendario_compartido'),
            'Volver a agendar': getUrl('calendario_compartido'),
            'Explorar': getUrl('explorar_casas'),
            'Favoritos': getUrl('mis_favoritos'),
            'Perfil': getUrl('perfil_de_usuario_con_rol_diferenciado')
        }
    },
    'configuracion_de_notificaciones': {
        parent: 'perfil_de_usuario_con_rol_diferenciado',
        links: {
            'arrow_back': getUrl('perfil_de_usuario_con_rol_diferenciado'),
            'Explorar': getUrl('explorar_casas'),
            'Favoritos': getUrl('mis_favoritos'),
            'Mensajes': getUrl('mensajes_y_afinidad'),
            'Perfil': getUrl('perfil_de_usuario_con_rol_diferenciado')
        }
    },
    'perfil_de_usuario_con_rol_diferenciado': {
        parent: 'explorar_casas',
        links: {
            'arrow_back': getUrl('explorar_casas'),
            'settings': getUrl('configuracion_de_notificaciones'),
            'Editar Perfil': '#', 'Mis anuncios': '#',
            'Publicar nueva casa': getUrl('publicar_casa_con_custodia'),
            'Gestionar': getUrl('planes_de_suscripcion'),
            'Notificaciones': getUrl('configuracion_de_notificaciones'),
            'Verificación de identidad': getUrl('verificacion_de_identidad'),
            'Planes de suscripción': getUrl('planes_de_suscripcion'),
            'Cerrar sesión': getUrl('onboarding_de_la_app'),
            'Explorar': getUrl('explorar_casas'),
            'Favoritos': getUrl('mis_favoritos'),
            'Mensajes': getUrl('mensajes_y_afinidad')
        }
    },
    'onboarding_de_la_app': {
        parent: null,
        links: {
            'Skip': getUrl('seleccion_de_rol'),
            'Next': getUrl('seleccion_de_rol'),
            'Sign in': getUrl('seleccion_de_rol'),
            'Comenzar': getUrl('seleccion_de_rol'),
            'Continuar': getUrl('seleccion_de_rol'),
            'Continue': getUrl('seleccion_de_rol'),
            'I have a room/house to share': getUrl('publicar_casa_con_custodia'),
            'I am looking for a home': getUrl('explorar_casas'),
            'room/house to share': getUrl('publicar_casa_con_custodia'),
            'looking for a home': getUrl('explorar_casas'),
            'List your space': getUrl('publicar_casa_con_custodia'),
            'Browse available listings': getUrl('explorar_casas')
        },
        cards: [
            { selector: '.group.cursor-pointer:first-child, .group:has(p:contains("room/house to share"))', target: getUrl('publicar_casa_con_custodia') },
            { selector: '.group.cursor-pointer:last-child, .group:has(p:contains("looking for a home"))', target: getUrl('explorar_casas') }
        ]
    },
    'seleccion_de_rol': {
        parent: 'onboarding_de_la_app',
        links: {
            'arrow_back': getUrl('onboarding_de_la_app'),
            'I have a room/house to share': getUrl('publicar_casa_con_custodia'),
            'I am looking for a home': getUrl('explorar_casas'),
            'Continue': getUrl('explorar_casas'),
            'Log in': getUrl('explorar_casas')
        }
    },
    'planes_de_suscripcion': {
        parent: 'perfil_de_usuario_con_rol_diferenciado',
        links: {
            'close': getUrl('perfil_de_usuario_con_rol_diferenciado'),
            'Suscribirme ahora': '#', 'Términos': '#', 'Privacidad': '#'
        }
    },
    'publicar_casa_con_custodia': {
        parent: 'perfil_de_usuario_con_rol_diferenciado',
        links: {
            'arrow_back': getUrl('perfil_de_usuario_con_rol_diferenciado'),
            'Guardar borrador': '#', 'Continuar al paso 2': '#'
        }
    },
    'verificacion_de_identidad': {
        parent: 'perfil_de_usuario_con_rol_diferenciado',
        links: {
            'arrow_back': getUrl('perfil_de_usuario_con_rol_diferenciado'),
            'Comenzar Verificación': '#'
        }
    }
};

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
function processAllScreens() {
    let modifiedCount = 0;
    
    for (const screen of SCREENS) {
        const filePath = path.join(SCREENS_DIR, screen, 'code.html');
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Archivo no encontrado: ${filePath}`);
            continue;
        }
        
        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html, { decodeEntities: false });
        const config = navigationMap[screen];
        if (!config) continue;
        
        let modified = false;
        
        // 0. Enlazar fotos de perfil/avatares en Header
        $('header img[class*="rounded-full"], header .rounded-full, .avatar, [data-testid="profile-avatar"]').each((i, el) => {
            if ($(el).closest('a').length === 0 && screen !== 'onboarding_de_la_app' && screen !== 'seleccion_de_rol') {
                wrapWithLink($, el, getUrl('perfil_de_usuario_con_rol_diferenciado'));
                modified = true;
            }
        });

        // 1. Procesar enlaces específicos por texto o icono (ampliado a a, p, span, div)
        if (config.links) {
            for (const [textOrIcon, targetUrl] of Object.entries(config.links)) {
                $(`button:contains("${textOrIcon}"), a:contains("${textOrIcon}"), p:contains("${textOrIcon}"), span:contains("${textOrIcon}")`).each((i, el) => {
                    const elText = $(el).text().replace(/\s+/g, ' ').trim();
                    if (elText.includes(textOrIcon)) {
                         let targetEl = $(el).closest('button').length ? $(el).closest('button')[0] : 
                                        $(el).closest('a').length ? $(el).closest('a')[0] : el;
                         
                         if (!$(targetEl).closest('a').length && targetUrl !== '#') {
                             wrapWithLink($, targetEl, targetUrl);
                             modified = true;
                         } else if ($(targetEl).is('a') && targetUrl !== '#') {
                             $(targetEl).attr('href', targetUrl);
                             modified = true;
                         }
                    }
                });
            }
        }
        
        // 2. Procesar tarjetas (cards)
        if (config.cards) {
            const cardsArray = Array.isArray(config.cards) ? config.cards : [config.cards];
            for (const cardConfig of cardsArray) {
                $(cardConfig.selector).each((i, card) => {
                    if (!$(card).closest('a').length) {
                        wrapWithLink($, card, cardConfig.target);
                        modified = true;
                    }
                });
            }
        }
        
        // 3. Procesar marcadores del mapa
        if (config.markers) {
            $(config.markers.selector).each((i, marker) => {
                if (!$(marker).closest('a').length) {
                    wrapWithLink($, marker, config.markers.target);
                    modified = true;
                }
            });
        }
        
        // 4. Procesar botones de atrás (fallbacks) genéricos y botones huerfanos
        $('button').each((i, btn) => {
            const $btn = $(btn);
            const hasLink = $btn.closest('a').length;
            const hasOnclick = $btn.attr('onclick');
            const isBackBtn = $btn.find('span:contains("arrow_back")').length || $btn.find('span:contains("close")').length;
            
            if (!hasLink && !hasOnclick && config.parent) {
                const parentPath = getUrl(config.parent);
                if (isBackBtn) {
                     wrapWithLink($, btn, parentPath);
                     modified = true;
                } else if ($btn.attr('href') === '#' || !$btn.attr('href')) {
                     // Ultimate fallback so they don't break
                     wrapWithLink($, btn, parentPath);
                     modified = true;
                }
            }
        });

        // 5. Botones sin enlace en A tags
        $('a').each((i, a) => {
             if (!$(a).attr('href') || $(a).attr('href') === '#') {
                  const parentPath = config.parent ? getUrl(config.parent) : '#';
                  if (parentPath !== '#') {
                      $(a).attr('href', parentPath);
                      modified = true; 
                  }
             }
        });
        
        if (modified) {
            fs.writeFileSync(filePath, $.html(), 'utf8');
            modifiedCount++;
            console.log(`✅ Procesado con rutas correctas: ${screen}`);
        }
    }
    console.log(`\n📊 Resumen: ${modifiedCount} pantallas modificadas de ${SCREENS.length}`);
}

// ============================================
// FUNCIÓN AUXILIAR: Envolver elemento con <a>
// o transformar <button> en <a>
// ============================================
function wrapWithLink($, element, targetUrl) {
    try {
        const $el = $(element);
        
        if ($el.is('button')) {
            const html = $el.html();
            const classes = $el.attr('class') || '';
            const styles = $el.attr('style') || '';
            
            const $anchor = $(`<a href="${targetUrl}" class="${classes}" style="${styles}">${html}</a>`);
            
            const attrs = $el.prop('attributes');
            if (attrs) {
                for (let attr of attrs) {
                    if (attr.name !== 'class' && attr.name !== 'style') {
                        $anchor.attr(attr.name, attr.value);
                    }
                }
            }
            $el.replaceWith($anchor);
        } else {
            // Fallback for divs, images, spans
            $el.wrap(`<a href="${targetUrl}" class="block h-full cursor-pointer"></a>`);
        }
    } catch (error) {
        console.warn(`⚠️ Error al envolver elemento: ${error.message}`);
    }
}

console.log('🚀 Iniciando conexión de pantallas (VERSIÓN FUSIONADA)...\n');
processAllScreens();
