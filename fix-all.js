/**
 * fix-all.js — Rehogar
 * ─────────────────────────────────────────────────────────────
 * Ejecutar desde la raíz del proyecto:  node fix-all.js
 *
 * Qué hace:
 *  1. Elimina las carpetas duplicadas (perfil_de_usuario y publicar_casa)
 *  2. Copia nav.js a /public/nav.js
 *  3. Inyecta <script src="/nav.js"> en los 16 HTMLs correctos
 *  4. Imprime un resumen final
 * ─────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = process.cwd();
const SCREENS_DIR  = path.join(ROOT, 'screens');
const PUBLIC_DIR   = path.join(ROOT, 'public');
const NAV_SRC      = path.join(__dirname, 'nav.js');   // nav.js junto a fix-all.js
const NAV_DST      = path.join(PUBLIC_DIR, 'nav.js');
const SCRIPT_TAG   = '<script src="/nav.js"></script>';

// ─── Pantallas a ELIMINAR (duplicados sin valor) ──────────────────────────
const DUPLICATES_TO_DELETE = [
  'perfil_de_usuario',   // conservamos perfil_de_usuario_con_rol_diferenciado
  'publicar_casa',       // conservamos publicar_casa_con_custodia
];

// ─── Las 16 pantallas correctas que deben quedar ─────────────────────────
const VALID_SCREENS = [
  'onboarding_de_la_app',
  'seleccion_de_rol',
  'verificacion_de_identidad',
  'explorar_casas',
  'busqueda_avanzada_con_custodia',
  'detalle_de_la_casa',
  'mapa_interactivo_de_casas',
  'mapa_con_zonas_escolares',
  'mensajes_y_afinidad',
  'mis_favoritos',
  'mis_visitas',
  'calendario_compartido',
  'perfil_de_usuario_con_rol_diferenciado',
  'publicar_casa_con_custodia',
  'planes_de_suscripcion',
  'configuracion_de_notificaciones',
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function deleteFolderRecursive(folderPath) {
  if (!fs.existsSync(folderPath)) return false;
  fs.rmSync(folderPath, { recursive: true, force: true });
  return true;
}

function findHtmlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...findHtmlFiles(full));
    } else if (entry.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function injectNav(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('src="/nav.js"') || content.includes("src='/nav.js'")) {
    return 'already';
  }
  if (content.includes('</body>')) {
    content = content.replace('</body>', `  ${SCRIPT_TAG}\n</body>`);
  } else {
    content += `\n${SCRIPT_TAG}\n`;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return 'injected';
}

// ─── PASO 1: Eliminar duplicados ──────────────────────────────────────────
function step1_deleteDuplicates() {
  console.log('\n━━━ PASO 1: Eliminar pantallas duplicadas ━━━\n');
  let deleted = 0;
  for (const name of DUPLICATES_TO_DELETE) {
    const folder = path.join(SCREENS_DIR, name);
    if (deleteFolderRecursive(folder)) {
      log('🗑 ', `Eliminada: screens/${name}/`);
      deleted++;
    } else {
      log('⚪', `No encontrada (ya eliminada): screens/${name}/`);
    }
  }
  console.log(`\n   → ${deleted} carpeta(s) eliminada(s)\n`);
}

// ─── PASO 2: Verificar que las 16 pantallas correctas existen ────────────
function step2_verifyScreens() {
  console.log('━━━ PASO 2: Verificar pantallas correctas ━━━\n');
  let ok = 0;
  let missing = [];
  for (const name of VALID_SCREENS) {
    const htmlPath = path.join(SCREENS_DIR, name, 'code.html');
    if (fs.existsSync(htmlPath)) {
      log('✅', `OK: ${name}`);
      ok++;
    } else {
      log('❌', `FALTA: screens/${name}/code.html`);
      missing.push(name);
    }
  }
  console.log(`\n   → ${ok}/16 pantallas encontradas`);
  if (missing.length > 0) {
    console.log(`   → Faltan: ${missing.join(', ')}\n`);
  } else {
    console.log(`   → Todo correcto\n`);
  }
  return missing;
}

// ─── PASO 3: Desplegar nav.js en /public ─────────────────────────────────
function step3_deployNavJs() {
  console.log('━━━ PASO 3: Desplegar nav.js en /public ━━━\n');

  // Crear /public si no existe
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  if (!fs.existsSync(NAV_SRC)) {
    log('❌', `nav.js no encontrado en: ${NAV_SRC}`);
    log('⚠ ', 'Asegúrate de tener nav.js junto a fix-all.js');
    return false;
  }

  fs.copyFileSync(NAV_SRC, NAV_DST);
  log('📦', `nav.js copiado a: public/nav.js`);
  return true;
}

// ─── PASO 4: Inyectar nav.js en todos los HTMLs ──────────────────────────
function step4_injectAll() {
  console.log('\n━━━ PASO 4: Inyectar nav.js en los HTMLs ━━━\n');

  let injected = 0;
  let already  = 0;
  let total    = 0;

  // Pantallas válidas
  for (const name of VALID_SCREENS) {
    const htmlPath = path.join(SCREENS_DIR, name, 'code.html');
    if (!fs.existsSync(htmlPath)) continue;
    total++;
    const result = injectNav(htmlPath);
    if (result === 'injected') {
      log('✅', `Inyectado: ${name}/code.html`);
      injected++;
    } else {
      log('⏭ ', `Ya tenía nav.js: ${name}/code.html`);
      already++;
    }
  }

  // index.html en la raíz
  const rootIndex = path.join(ROOT, 'index.html');
  if (fs.existsSync(rootIndex)) {
    total++;
    const result = injectNav(rootIndex);
    if (result === 'injected') {
      log('✅', `Inyectado: index.html`);
      injected++;
    } else {
      log('⏭ ', `Ya tenía nav.js: index.html`);
      already++;
    }
  }

  console.log(`\n   → ${injected} inyectados, ${already} ya lo tenían (total: ${total})\n`);
}

// ─── PASO 5: Limpiar scripts de fix sueltos de la raíz ───────────────────
function step5_cleanupRootScripts() {
  console.log('━━━ PASO 5: Limpiar scripts temporales de la raíz ━━━\n');

  const SCRIPTS_TO_REMOVE = [
    'aggressive_cleanup.js',
    'analyze_screens.js',
    'audit_links.js',
    'cleanup_screens.js',
    'connect_nav.js',
    'debug_cleanup.js',
    'fix_onboarding_complete.js',
    'fix_publicar_casa.js',
    'fix_publicar_casa_v2.js',
    'analysis_output.txt',
    'audit_output.txt',
  ];

  let removed = 0;
  for (const file of SCRIPTS_TO_REMOVE) {
    const filePath = path.join(ROOT, file);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
      log('🗑 ', `Eliminado: ${file}`);
      removed++;
    }
  }

  if (removed === 0) {
    log('⚪', 'No había scripts temporales que limpiar');
  }
  console.log(`\n   → ${removed} archivo(s) eliminado(s)\n`);
}

// ─── RESUMEN FINAL ────────────────────────────────────────────────────────
function printSummary(missing) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  fix-all.js completado');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Próximos pasos:');
  console.log('  1. Actualiza src/server.ts con server-nav-patch.ts');
  console.log('  2. Ejecuta:  npm start');
  console.log('  3. Abre:     http://localhost:3000\n');

  if (missing.length > 0) {
    console.log('⚠️  Pantallas que faltan y hay que crear:');
    missing.forEach(s => console.log(`     - ${s}`));
    console.log();
  }

  console.log('Estructura final de screens/:');
  VALID_SCREENS.forEach(s => {
    const exists = fs.existsSync(path.join(SCREENS_DIR, s, 'code.html'));
    console.log(`  ${exists ? '✅' : '❌'}  ${s}`);
  });
  console.log();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
function main() {
  console.log('\n🏠  Rehogar — Fix All Script');
  console.log('─────────────────────────────────────────────\n');

  step1_deleteDuplicates();
  const missing = step2_verifyScreens();
  const navOk = step3_deployNavJs();
  if (navOk) step4_injectAll();
  step5_cleanupRootScripts();
  printSummary(missing);
}

main();
