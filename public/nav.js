/**
 * nav.js — Sistema central de navegación de Rehogar
 * Inyectar en todas las pantallas con: <script src="/nav.js"></script>
 *
 * Funciona detectando botones/links por su contenido de texto o atributos
 * y añadiendo los href o onclick correctos según la pantalla actual.
 */

(function () {
  'use strict';

  // ─── Mapa de rutas ────────────────────────────────────────────────────────
  const ROUTES = {
    home:            '/',
    explorar:        '/screens-static/explorar_casas/code.html',
    detalle:         '/screens-static/detalle_de_la_casa/code.html',
    busqueda:        '/screens-static/busqueda_avanzada_con_custodia/code.html',
    mensajes:        '/screens-static/mensajes_y_afinidad/code.html',
    favoritos:       '/screens-static/mis_favoritos/code.html',
    perfil:          '/screens-static/perfil_de_usuario_con_rol_diferenciado/code.html',
    publicar:        '/screens-static/publicar_casa_con_custodia/code.html',
    planes:          '/screens-static/planes_de_suscripcion/code.html',
    visitas:         '/screens-static/mis_visitas/code.html',
    calendario:      '/screens-static/calendario_compartido/code.html',
    verificacion:    '/screens-static/verificacion_de_identidad/code.html',
    mapa:            '/screens-static/mapa_interactivo_de_casas/code.html',
    mapaEscolar:     '/screens-static/mapa_con_zonas_escolares/code.html',
    notificaciones:  '/screens-static/configuracion_de_notificaciones/code.html',
    seleccionRol:    '/screens-static/seleccion_de_rol/code.html',
    onboarding:      '/screens-static/onboarding_de_la_app/code.html',
    programarVisita: '/screens-static/programar_visita/code.html',
  };

  // ─── Navegar ──────────────────────────────────────────────────────────────
  function go(route) {
    window.location.href = ROUTES[route] || ROUTES.explorar;
  }

  // Exponer globalmente para uso inline
  window.rehogar = { go, ROUTES };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function text(el) {
    return (el.textContent || '').trim().toLowerCase();
  }

  function hasText(el, ...terms) {
    const t = text(el);
    return terms.some(term => t.includes(term.toLowerCase()));
  }

  function hasIcon(el, iconName) {
    return el.querySelector && el.querySelector(
      `.material-symbols-outlined, .material-icons, [class*="material"]`
    ) && el.querySelector(
      `.material-symbols-outlined, .material-icons, [class*="material"]`
    ).textContent.trim() === iconName;
  }

  function setLink(el, route) {
    const url = ROUTES[route] || route;
    if (el.tagName === 'A') {
      el.href = url;
    } else {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = url;
      });
    }
  }

  // ─── Bottom navigation — presente en casi todas las pantallas ─────────────
  function connectBottomNav() {
    document.querySelectorAll('nav a, footer a').forEach(a => {
      const t = text(a);
      const icon = a.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (t.includes('inicio') || t.includes('home') || iconText === 'home') {
        a.href = ROUTES.home;
      } else if (t.includes('explorar') || t.includes('explore') || iconText === 'explore') {
        a.href = ROUTES.explorar;
      } else if (t.includes('favorito') || t.includes('favorite') || t.includes('match') || iconText === 'favorite') {
        a.href = ROUTES.favoritos;
      } else if (t.includes('mensaje') || t.includes('chat') || t.includes('message') || iconText === 'chat_bubble') {
        a.href = ROUTES.mensajes;
      } else if (t.includes('perfil') || t.includes('profile') || iconText === 'person') {
        a.href = ROUTES.perfil;
      } else if (t.includes('mapa') || t.includes('map') || iconText === 'map') {
        a.href = ROUTES.mapa;
      }
    });
  }

  // ─── Avatar / foto de perfil en header ────────────────────────────────────
  function connectProfileAvatar() {
    document.querySelectorAll('header img, header .rounded-full').forEach(el => {
      const parent = el.closest('a') || el.closest('[onclick]');
      if (!parent) {
        const wrapper = el.parentElement;
        if (wrapper && wrapper.tagName !== 'A') {
          wrapper.style.cursor = 'pointer';
          wrapper.addEventListener('click', () => go('perfil'));
        }
      }
    });
  }

  // ─── Botón notificaciones en header ───────────────────────────────────────
  function connectNotificationsBtn() {
    document.querySelectorAll('button').forEach(btn => {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon && icon.textContent.trim() === 'notifications') {
        setLink(btn, 'notificaciones');
      }
    });
  }

  // ─── Botones de filtro rápido (explorar) ──────────────────────────────────
  function connectQuickFilters() {
    document.querySelectorAll('button').forEach(btn => {
      const t = text(btn);
      if (t.includes('ver mapa') || t.includes('list view') || t.includes('list') && t.includes('view')) {
        setLink(btn, 'mapa');
      }
    });
  }

  // ─── Pantalla: ONBOARDING ─────────────────────────────────────────────────
  function connectOnboarding() {
    document.querySelectorAll('a, button').forEach(el => {
      const t = text(el);
      if (t === 'sign in' || t === 'log in' || t === 'iniciar sesión' || t === 'entrar') {
        setLink(el, 'seleccionRol');
      } else if (t === 'skip' || t === 'saltar') {
        setLink(el, 'seleccionRol');
      } else if (t.includes('next') || t.includes('siguiente')) {
        // el botón Next avanza slides; al llegar al último va a seleccionRol
        el.addEventListener('click', () => {
          const dots = document.querySelectorAll('[class*="dot"], [class*="indicator"], [class*="step"]');
          const active = document.querySelectorAll('[class*="active"]');
          // Heurística: si es el último slide, navegar
          if (dots.length > 0 && active.length >= dots.length) {
            go('seleccionRol');
          }
        });
        // Si no hay dots/slides, ir directamente
        if (!document.querySelector('[class*="dot"], [class*="slide"], [class*="indicator"]')) {
          setLink(el, 'seleccionRol');
        }
      }
    });
  }

  // ─── Pantalla: SELECCIÓN DE ROL ───────────────────────────────────────────
  function connectSeleccionRol() {
    document.querySelectorAll('a, button').forEach(el => {
      const t = text(el);
      if (t === 'log in' || t === 'sign in' || t === 'iniciar sesión') {
        setLink(el, 'onboarding');
      } else if (t === 'continue' || t === 'continuar') {
        setLink(el, 'verificacion');
      } else if (t.includes('back') || t.includes('volver') || t.includes('atrás')) {
        setLink(el, 'onboarding');
      }
      // Los chevron_right de cada rol (demandante / ofertante)
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      if (icon && icon.textContent.trim() === 'chevron_right' && !el.closest('form')) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          go('verificacion');
        });
      }
    });
  }

  // ─── Pantalla: VERIFICACIÓN DE IDENTIDAD ──────────────────────────────────
  function connectVerificacion() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      if (t.includes('comenzar') || t.includes('verificar') || t.includes('start') || t.includes('iniciar')) {
        // Simula verificación y va al explorador
        el.addEventListener('click', (e) => {
          e.preventDefault();
          // Pequeño feedback visual antes de navegar
          el.textContent = '✓ Verificando...';
          el.style.opacity = '0.7';
          setTimeout(() => go('explorar'), 1200);
        });
      }
      if (t.includes('volver') || t.includes('back') || t.includes('atrás')) {
        setLink(el, 'seleccionRol');
      }
    });
  }

  // ─── Pantalla: EXPLORAR CASAS ─────────────────────────────────────────────
  function connectExplorar() {
    // Filtros de género/mascotas — toggle visual, no navegan
    document.querySelectorAll('button').forEach(btn => {
      const t = text(btn);
      if (t.includes('solo hombre') || t.includes('solo mujer') ||
          t.includes('mascotas') || t.includes('no mascotas')) {
        btn.addEventListener('click', () => {
          btn.classList.toggle('bg-primary');
          btn.classList.toggle('text-white');
        });
      }
    });
  }

  // ─── Pantalla: BÚSQUEDA AVANZADA ──────────────────────────────────────────
  function connectBusqueda() {
    document.querySelectorAll('button').forEach(btn => {
      const t = text(btn);

      // Limpiar filtros — recarga la misma pantalla
      if (t === 'limpiar' || t === 'clear') {
        btn.addEventListener('click', () => window.location.reload());
        return;
      }

      // Aplicar filtros → volver a explorar
      if (t.includes('aplicar') || t.includes('apply') || t.includes('buscar')) {
        setLink(btn, 'explorar');
        return;
      }

      // Botones de tipo vivienda, género, custodia, estilo — toggle visual
      const toggleTerms = [
        'apartamento','casa','chalet','estudio',
        'hombres','mujeres','mixto',
        'bebés','pequeños','escolares','adolescentes',
        'fines de semana','semanas alternas','custodia completa','sin hijos',
        'tranquilo','social','organizado','deporte','cine'
      ];
      if (toggleTerms.some(term => t.includes(term))) {
        btn.addEventListener('click', () => {
          btn.classList.toggle('bg-primary');
          btn.classList.toggle('text-white');
          btn.classList.toggle('border-primary');
        });
        return;
      }

      // Incrementadores +/- de habitaciones/precio
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        const iconText = icon.textContent.trim();
        if (iconText === 'add' || iconText === 'remove') {
          btn.addEventListener('click', () => {
            const parent = btn.closest('div');
            const display = parent && parent.querySelector('p, span[class*="text"]');
            if (display) {
              let val = parseInt(display.textContent) || 0;
              display.textContent = iconText === 'add'
                ? Math.min(val + 1, 20)
                : Math.max(val - 1, 0);
            }
          });
        }
      }
    });
  }

  // ─── Pantalla: DETALLE DE LA CASA ─────────────────────────────────────────
  function connectDetalle() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (t.includes('contactar') || t.includes('enviar') || t.includes('send') || iconText === 'send') {
        setLink(el, 'mensajes');
      } else if (iconText === 'share' || t.includes('compartir')) {
        el.addEventListener('click', () => {
          if (navigator.share) {
            navigator.share({ title: 'Rehogar', url: window.location.href });
          } else {
            navigator.clipboard && navigator.clipboard.writeText(window.location.href);
            alert('Enlace copiado al portapapeles');
          }
        });
      } else if (t.includes('programar') || t.includes('visita') || t.includes('agendar')) {
        setLink(el, 'visitas');
      } else if (t.includes('explorar') || t.includes('volver') || t.includes('back') || iconText === 'arrow_back') {
        setLink(el, 'explorar');
      } else if (iconText === 'favorite' || t.includes('favorito') || t.includes('guardar')) {
        btn_toggle_favorite(el);
      }
    });
  }

  function btn_toggle_favorite(el) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      el.classList.toggle('text-primary');
      const icon = el.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = icon.style.fontVariationSettings === "'FILL' 1" ? "'FILL' 0" : "'FILL' 1";
    });
  }

  // ─── Pantalla: MENSAJES Y AFINIDAD ────────────────────────────────────────
  function connectMensajes() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (iconText === 'menu') {
        // Menú hamburguesa → no navega, toggle sidebar (vacío por ahora)
        el.addEventListener('click', () => {
          const sidebar = document.getElementById('sidebar');
          if (sidebar) sidebar.classList.toggle('hidden');
        });
      } else if (iconText === 'search' && !t.includes('explorar')) {
        el.addEventListener('click', () => {
          const searchBox = document.querySelector('input[type="search"], input[placeholder*="buscar"], input[placeholder*="search"]');
          if (searchBox) searchBox.focus();
        });
      } else if (iconText === 'close') {
        el.addEventListener('click', () => {
          const searchBox = document.querySelector('input[type="search"]');
          if (searchBox) { searchBox.value = ''; searchBox.blur(); }
        });
      } else if (iconText === 'edit_square' || t.includes('nuevo') || t.includes('redactar') || t.includes('new message')) {
        // Nuevo mensaje → abrir un chat (en prototipo, va a explorar para buscar persona)
        setLink(el, 'explorar');
      }
      // Los avatares de conversación → ir a detalle de casa
      if (el.tagName === 'IMG' && el.closest('[onclick], li, [class*="convers"], [class*="chat"]')) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => go('detalle'));
      }
    });

    // Filas de conversación — clic en cualquier parte → detalle/chat
    document.querySelectorAll('[class*="convers"], [class*="chat-item"], li').forEach(row => {
      if (!row.querySelector('a')) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
          // Dentro de mensajes, un clic en una conversación podría abrir detalle
          // Por ahora no navegamos, solo feedback visual
        });
      }
    });
  }

  // ─── Pantalla: MIS FAVORITOS ──────────────────────────────────────────────
  function connectFavoritos() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (t.includes('ver detalles') || t.includes('ver más') || t.includes('see details')) {
        setLink(el, 'detalle');
      } else if (iconText === 'favorite' || iconText === 'favorite_border') {
        btn_toggle_favorite(el);
      } else if (iconText === 'arrow_back' || t.includes('volver') || t.includes('back')) {
        setLink(el, 'explorar');
      } else if (iconText === 'more_vert') {
        // Menú de opciones — toggle pequeño menú contextual (sin navegación)
        el.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    });

    // Cards de favoritos → ir a detalle
    document.querySelectorAll('[class*="card"], [class*="item"], [class*="property"]').forEach(card => {
      if (!card.querySelector('a') && !card.hasAttribute('onclick')) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => go('detalle'));
      }
    });
  }

  // ─── Pantalla: MAPA INTERACTIVO ───────────────────────────────────────────
  function connectMapa() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (iconText === 'tune' || t.includes('filtro') || t.includes('filter')) {
        setLink(el, 'busqueda');
      } else if (iconText === 'my_location' || t.includes('mi ubicación') || t.includes('location')) {
        el.addEventListener('click', () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(() => {});
          }
        });
      } else if (t.includes('list') || t.includes('lista') || t.includes('list view')) {
        setLink(el, 'explorar');
      } else if (t.includes('zonas') || t.includes('escolar')) {
        setLink(el, 'mapaEscolar');
      }

      // Filtros rápidos → toggle visual
      const filterTerms = ['gender','pets','rooms','price','precio','género','mascotas','habitacion'];
      if (filterTerms.some(term => t.includes(term))) {
        el.addEventListener('click', () => el.classList.toggle('bg-primary'));
      }
    });

    // Marcadores del mapa → ir a detalle
    document.querySelectorAll('[class*="marker"], [class*="pin"], [class*="casa-pin"]').forEach(pin => {
      pin.style.cursor = 'pointer';
      pin.addEventListener('click', () => go('detalle'));
    });
  }

  // ─── Pantalla: MAPA CON ZONAS ESCOLARES ───────────────────────────────────
  function connectMapaEscolar() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (iconText === 'tune') { setLink(el, 'busqueda'); }
      else if (iconText === 'my_location') {
        el.addEventListener('click', () => navigator.geolocation && navigator.geolocation.getCurrentPosition(() => {}));
      } else if (t.includes('list') || t.includes('lista')) { setLink(el, 'explorar'); }
      else if (t.includes('explore') || t.includes('explorar') || iconText === 'map') { setLink(el, 'mapa'); }
      else if (t.includes('match') || t.includes('favorite') || iconText === 'favorite') { setLink(el, 'favoritos'); }
      else if (t.includes('chat') || iconText === 'chat_bubble') { setLink(el, 'mensajes'); }
      else if (t.includes('profile') || t.includes('perfil') || iconText === 'person') { setLink(el, 'perfil'); }
      else if (iconText === 'school' || t.includes('zona escolar')) {
        el.classList.toggle('bg-primary');
      }
    });
  }

  // ─── Pantalla: CALENDARIO COMPARTIDO ─────────────────────────────────────
  function connectCalendario() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (iconText === 'settings' || t.includes('ajuste') || t.includes('settings')) {
        setLink(el, 'notificaciones');
      } else if (iconText === 'notifications') {
        setLink(el, 'notificaciones');
      } else if (iconText === 'add') {
        // Añadir evento → modal o feedback visual
        el.addEventListener('click', () => {
          const modal = document.getElementById('add-event-modal');
          if (modal) { modal.classList.toggle('hidden'); }
        });
      } else if (iconText === 'chevron_left' || iconText === 'chevron_right') {
        // Navegación de mes → cambiar mes visualmente
        el.addEventListener('click', () => {
          const monthEl = document.querySelector('[class*="month"], [class*="mes"], h2, h3');
          if (monthEl) {
            // Solo feedback, no cambia el mes real en el prototipo
          }
        });
      } else if (iconText === 'more_vert') {
        el.addEventListener('click', (e) => e.stopPropagation());
      } else if (iconText === 'calendar_month' || t.includes('calendario')) {
        // Ya estamos en calendario — no navegar
      } else if (t.includes('ajuste') || t.includes('settings')) {
        setLink(el, 'notificaciones');
      }

      // Días del mes — clic → feedback visual de selección
      const isDay = /^\d{1,2}$/.test(t);
      if (isDay) {
        el.addEventListener('click', () => {
          document.querySelectorAll('[class*="day-btn"], .day-btn').forEach(d => {
            d.classList.remove('bg-primary', 'text-white');
          });
          el.classList.add('bg-primary', 'text-white');
          el.classList.add('day-btn');
        });
      }
    });
  }

  // ─── Pantalla: MIS VISITAS ────────────────────────────────────────────────
  function connectVisitas() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (iconText === 'arrow_back' || t.includes('volver') || t.includes('back')) {
        setLink(el, 'explorar');
      } else if (iconText === 'notifications') {
        setLink(el, 'notificaciones');
      } else if (t.includes('próximas') || t.includes('upcoming') || t.includes('historial') || t.includes('history')) {
        // Tabs — toggle visual
        document.querySelectorAll('button').forEach(b => {
          if (b.textContent.includes('Próximas') || b.textContent.includes('Historial')) {
            b.classList.remove('bg-primary', 'text-white');
          }
        });
        el.classList.add('bg-primary', 'text-white');
      } else if (t.includes('cancelar') || t.includes('cancel')) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('¿Confirmas que quieres cancelar esta visita?')) {
            const card = el.closest('[class*="card"], [class*="item"], li');
            if (card) { card.style.opacity = '0.4'; }
          }
        });
      } else if (t.includes('cambiar fecha') || t.includes('edit_calendar') || iconText === 'edit_calendar') {
        setLink(el, 'calendario');
      } else if (t.includes('volver a agendar') || t.includes('reagendar')) {
        setLink(el, 'calendario');
      } else if (iconText === 'add' || t.includes('nueva visita') || t.includes('añadir')) {
        setLink(el, 'mapa');
      }
    });
  }

  // ─── Pantalla: PERFIL DE USUARIO ──────────────────────────────────────────
  function connectPerfil() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (iconText === 'settings' || t.includes('ajuste') || t.includes('configuración')) {
        setLink(el, 'notificaciones');
      } else if (t.includes('editar perfil') || t.includes('edit profile')) {
        el.addEventListener('click', () => {
          alert('Editor de perfil — próximamente disponible');
        });
      } else if (t.includes('mis anuncio') || t.includes('my listing')) {
        setLink(el, 'publicar');
      } else if (t.includes('publicar nueva casa') || iconText === 'add_circle') {
        setLink(el, 'publicar');
      } else if (t.includes('gestionar') || t.includes('manage')) {
        setLink(el, 'publicar');
      } else if (t.includes('cerrar sesión') || t.includes('logout') || iconText === 'logout') {
        el.addEventListener('click', () => {
          if (confirm('¿Seguro que quieres cerrar sesión?')) {
            go('onboarding');
          }
        });
      } else if (t.includes('favorito') || iconText === 'favorite') {
        setLink(el, 'favoritos');
      } else if (t.includes('planes') || t.includes('suscripción') || t.includes('premium')) {
        setLink(el, 'planes');
      } else if (t.includes('mis visitas') || t.includes('visita')) {
        setLink(el, 'visitas');
      } else if (t.includes('verificar') || t.includes('verificación')) {
        setLink(el, 'verificacion');
      }
    });
  }

  // ─── Pantalla: PUBLICAR CASA ──────────────────────────────────────────────
  function connectPublicar() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';

      if (iconText === 'arrow_back' || t.includes('volver') || t.includes('back')) {
        setLink(el, 'perfil');
      } else if (t.includes('guardar borrador') || t.includes('save draft')) {
        el.addEventListener('click', () => {
          el.textContent = '✓ Borrador guardado';
          setTimeout(() => { el.textContent = 'Guardar borrador'; }, 2000);
        });
      } else if (t.includes('continuar al paso') || t.includes('next step') || t.includes('siguiente')) {
        // Paso 2 del formulario → feedback y simular avance
        el.addEventListener('click', () => {
          const step = document.querySelector('[class*="step"], [class*="progress"]');
          if (step) {
            // En prototipo, va a perfil al terminar
            go('perfil');
          } else {
            go('perfil');
          }
        });
      }

      // Amenities y preferencias — toggle visual
      const amenityTerms = ['terraza','piscina','urbanización','ascensor','garaje','perros','no fumadores','mujeres','hombres'];
      if (amenityTerms.some(term => t.includes(term))) {
        el.addEventListener('click', () => {
          el.classList.toggle('bg-primary');
          el.classList.toggle('text-white');
          el.classList.toggle('border-primary');
        });
      }
    });
  }

  // ─── Pantalla: PLANES DE SUSCRIPCIÓN ─────────────────────────────────────
  function connectPlanes() {
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);

      if (t.includes('suscribirme') || t.includes('subscribe') || t.includes('contratar') || t.includes('elegir')) {
        el.addEventListener('click', () => {
          el.textContent = '✓ ¡Suscripción activada!';
          el.style.background = '#11d462';
          setTimeout(() => go('perfil'), 1500);
        });
      } else if (t.includes('términos') || t.includes('terms')) {
        el.href = '#';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Términos y Condiciones de Rehogar — Documento legal completo próximamente');
        });
      } else if (t.includes('privacidad') || t.includes('privacy')) {
        el.href = '#';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Política de Privacidad de Rehogar — próximamente');
        });
      } else if (t.includes('volver') || t.includes('back')) {
        setLink(el, 'perfil');
      }
    });
  }

  // ─── Pantalla: CONFIG. NOTIFICACIONES ────────────────────────────────────
  function connectNotificaciones() {
    // Esta pantalla ya tiene todos sus links OK según auditoría.
    // Solo asegurar navegación de back
    document.querySelectorAll('button, a').forEach(el => {
      const t = text(el);
      const icon = el.querySelector && el.querySelector('.material-symbols-outlined');
      const iconText = icon ? icon.textContent.trim() : '';
      if (iconText === 'arrow_back' || t.includes('volver') || t.includes('back')) {
        setLink(el, 'perfil');
      }
    });
  }

  // ─── Detectar pantalla actual y aplicar conexiones ────────────────────────
  function detectScreen() {
    const path = window.location.pathname.toLowerCase();
    const screens = {
      'onboarding':              connectOnboarding,
      'seleccion_de_rol':        connectSeleccionRol,
      'verificacion_de_identidad': connectVerificacion,
      'explorar_casas':          connectExplorar,
      'busqueda_avanzada':       connectBusqueda,
      'detalle_de_la_casa':      connectDetalle,
      'mensajes_y_afinidad':     connectMensajes,
      'mis_favoritos':           connectFavoritos,
      'mapa_interactivo':        connectMapa,
      'mapa_con_zonas':          connectMapaEscolar,
      'calendario_compartido':   connectCalendario,
      'mis_visitas':             connectVisitas,
      'perfil_de_usuario':       connectPerfil,
      'publicar_casa':           connectPublicar,
      'planes_de_suscripcion':   connectPlanes,
      'configuracion_de_notificaciones': connectNotificaciones,
    };

    for (const [key, fn] of Object.entries(screens)) {
      if (path.includes(key)) {
        fn();
        return;
      }
    }

    // Página principal (index)
    if (path === '/' || path.includes('index') || path.endsWith('.html') === false) {
      connectExplorar();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    connectBottomNav();
    connectProfileAvatar();
    connectNotificationsBtn();
    connectQuickFilters();
    detectScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
