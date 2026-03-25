const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SCREENS_DIR = path.join(__dirname, 'screens');
const BASE_URL = '/screens-static';

const getScreenUrl = (name) => `${BASE_URL}/${name}/code.html`;

const MAPPINGS = {
    // Top-level navigation buttons (just in case they need to be fully robust)
    bottomNav: {
        'Inicio': 'explorar_casas',
        'Favoritos': 'mis_favoritos',
        'Mensajes': 'mensajes_y_afinidad',
        'Perfil': 'perfil_de_usuario_con_rol_diferenciado'
    },
    // Screen specific logic
    screens: {
        'onboarding_de_la_app': {
            texts: { 'Comenzar': 'seleccion_de_rol', 'Siguiente': 'seleccion_de_rol', 'Continuar': 'seleccion_de_rol' }
        },
        'seleccion_de_rol': {
            texts: { 'Continuar': 'explorar_casas', 'Empezar a buscar': 'explorar_casas' }
        },
        'explorar_casas': {
            icons: { 'search': 'busqueda_avanzada_con_custodia', 'map': 'mapa_interactivo_de_casas', 'tune': 'busqueda_avanzada_con_custodia' },
            imagesTo: 'detalle_de_la_casa'
        },
        'detalle_de_la_casa': {
            icons: { 'arrow_back': 'explorar_casas', 'chat': 'mensajes_y_afinidad' },
            texts: { 'Enviar Mensaje': 'mensajes_y_afinidad', 'Solicitar visita': 'mis_visitas', 'Agendar visita': 'mis_visitas' }
        },
        'busqueda_avanzada_con_custodia': {
            icons: { 'close': 'explorar_casas', 'arrow_back': 'explorar_casas' },
            texts: { 'Mostrar resultados': 'explorar_casas', 'Aplicar': 'explorar_casas', '12 resultados': 'explorar_casas' }
        },
        'mapa_interactivo_de_casas': {
            icons: { 'arrow_back': 'explorar_casas', 'list': 'explorar_casas', 'school': 'mapa_con_zonas_escolares' },
            texts: { 'Lista': 'explorar_casas' },
            imagesTo: 'detalle_de_la_casa'
        },
        'mapa_con_zonas_escolares': {
            icons: { 'arrow_back': 'mapa_interactivo_de_casas', 'close': 'mapa_interactivo_de_casas' }
        },
        'perfil_de_usuario_con_rol_diferenciado': {
            texts: {
                'Verificación de identidad': 'verificacion_de_identidad',
                'Planes de suscripción': 'planes_de_suscripcion',
                'Notificaciones': 'configuracion_de_notificaciones',
                'Publicar casa': 'publicar_casa_con_custodia',
                'Añadir propiedad': 'publicar_casa_con_custodia'
            }
        },
        'configuracion_de_notificaciones': { icons: { 'arrow_back': 'perfil_de_usuario_con_rol_diferenciado', 'close': 'perfil_de_usuario_con_rol_diferenciado' } },
        'verificacion_de_identidad': { icons: { 'arrow_back': 'perfil_de_usuario_con_rol_diferenciado', 'close': 'perfil_de_usuario_con_rol_diferenciado' } },
        'planes_de_suscripcion': { icons: { 'arrow_back': 'perfil_de_usuario_con_rol_diferenciado', 'close': 'perfil_de_usuario_con_rol_diferenciado' } },
        'publicar_casa_con_custodia': { 
            icons: { 'arrow_back': 'perfil_de_usuario_con_rol_diferenciado', 'close': 'perfil_de_usuario_con_rol_diferenciado' },
            texts: { 'Finalizar': 'explorar_casas', 'Publicar': 'explorar_casas' }
        },
        'mis_favoritos': {
            imagesTo: 'detalle_de_la_casa'
        },
        'mis_visitas': {
            icons: { 'calendar_month': 'calendario_compartido', 'event': 'calendario_compartido' }
        },
        'calendario_compartido': {
            icons: { 'arrow_back': 'mis_visitas', 'close': 'mis_visitas' },
        }
    }
};

const screens = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

let modifiedCount = 0;

for (const screen of screens) {
    const htmlPath = path.join(SCREENS_DIR, screen, 'code.html');
    if (!fs.existsSync(htmlPath)) continue;

    let html = fs.readFileSync(htmlPath, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });
    let modified = false;

    const updateHref = (el, targetScreen) => {
        if (!targetScreen) return;
        const url = getScreenUrl(targetScreen);
        
        let $el = $(el);
        if ($el.is('a')) {
            $el.attr('href', url);
            modified = true;
        } else if ($el.parent().is('a')) {
            $el.parent().attr('href', url);
            modified = true;
        } else {
            // Wrap the specific nested tag in link directly, to avoid breaking flex layouts
            if ($el.is('img') || $el.is('span')) {
                 $el.wrap(`<a href="${url}" class="cursor-pointer"></a>`);
                 modified = true;
            } else if ($el.is('button')) {
                 $el.wrap(`<a href="${url}" class="block w-full cursor-pointer"></a>`);
                 modified = true;
            } else {
                 $el.wrap(`<a href="${url}"></a>`);
                 modified = true;
            }
        }
    };

    // Replace bottom nav
    $('nav.fixed.bottom-0 a').each((_, el) => {
        const textArea = $(el).text();
        for (const [key, target] of Object.entries(MAPPINGS.bottomNav)) {
            if (textArea.includes(key)) {
                $(el).attr('href', getScreenUrl(target));
                modified = true;
            }
        }
    });

    const rules = MAPPINGS.screens[screen] || {};
    
    // Process exact text replacements
    if (rules.texts) {
        for (const [text, target] of Object.entries(rules.texts)) {
            $('*').each((i, el) => {
                // To safely get direct text without nested elements
                if ($(el).children().length === 0 && $(el).text().trim() === text) {
                   let targetEl = $(el).closest('button').length ? $(el).closest('button') : 
                                  $(el).closest('a').length ? $(el).closest('a') : $(el);
                   updateHref(targetEl, target);
                }
            });
        }
    }

    // Process material icons
    if (rules.icons) {
        for (const [icon, target] of Object.entries(rules.icons)) {
            $('span.material-symbols-outlined').each((i, el) => {
                if ($(el).text().trim() === icon) {
                    let targetEl = $(el).closest('button').length ? $(el).closest('button') : 
                                   $(el).closest('a').length ? $(el).closest('a') : $(el);
                    updateHref(targetEl, target);
                }
            });
        }
    }

    // Process clickable images (property cards)
    if (rules.imagesTo) {
        $('img').each((i, el) => {
             // Let's assume images that fill containers are property images (aspect ratios / object cover)
             // and avoid avatar size images
             let isAvatar = $(el).parent().hasClass('size-10') || $(el).hasClass('size-8') || $(el).parent().hasClass('size-8');
             if ($(el).hasClass('object-cover') && !isAvatar) {
                updateHref($(el), rules.imagesTo);
             }
        });
    }

    if (modified) {
        fs.writeFileSync(htmlPath, $.html(), 'utf8');
        modifiedCount++;
    }
}

console.log(`Successfully mapped interactions in ${modifiedCount} screens.`);
