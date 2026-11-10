# Rehogar

Plataforma de coliving para personas divorciadas o en procesos de separación: ofertar y encontrar casa, con custodia de hijos, afinidad y calendario compartido.

## Stack

- **Backend**: Node.js + Express 4 (TypeScript)
- **Base de datos**: SQLite (`better-sqlite3`)
- **Auth**: JWT + bcrypt
- **Validación**: Zod
- **Seguridad**: Helmet, CORS, express-rate-limit, Winston (logs)
- **Tests**: Jest + Supertest
- **Frontend**: HTML/CSS/JS estático servido por Express

## Requisitos

- Node.js >= 18

## Instalación

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run build
npm start
```

La app arranca en `http://localhost:3000` y crea la BD SQLite. Los datos de prueba (`ana@rehogar.com` / `carlos@rehogar.com`, contraseña `password123`) solo se siembran con `NODE_ENV=development` **y** `SEED_DEMO=1`.

## Configuración (`.env`)

| Variable    | Descripción                              | Ejemplo                |
|-------------|------------------------------------------|------------------------|
| `PORT`      | Puerto del servidor                      | `3000`                 |
| `NODE_ENV`  | `development` o `production`             | `development`          |
| `JWT_SECRET`| Secreto para firmar tokens               | 64 caracteres hex      |
| `DB_PATH`   | Ruta del archivo SQLite                  | `./data/rehogar.db`    |
| `CORS_ORIGIN` | Orígenes CORS admitidos (comas)        | `https://tu-dominio`   |
| `TRUST_PROXY` | `1` solo si hay proxy delante           | `1`                    |
| `SEED_DEMO` | `1` para sembrar datos demo (dev)      | `1`                    |
| `GOOGLE_MAPS_EMBED_KEY` | Clave de Maps Embed (restringida por referrer) | `AIza...` |

`JWT_SECRET` es obligatorio en **todos** los entornos: el servidor aborta si falta, si es el valor de ejemplo de `.env.example` o si mide menos de 16 caracteres.

## Despliegue

SQLite vive en disco (`DB_PATH`) y también los logs (`logs/`), así que un entorno serverless (Vercel Functions, AWS Lambda) pierde los datos en cada arranque. Despliega en un VPS o contenedor con volumen persistente. Detrás de un proxy inverso, pon `TRUST_PROXY=1` y configura `CORS_ORIGIN` con tu dominio.

## Scripts

| Comando          | Descripción                               |
|------------------|-------------------------------------------|
| `npm run dev`    | Arranca con nodemon + ts-node             |
| `npm run build`  | Compila TypeScript a `dist/`              |
| `npm start`      | Ejecuta el build                          |
| `npm run db:init`| Inicializa/resetea la BD                  |
| `npm test`       | Tests (Jest con cobertura)                |

## API

- `POST /api/auth/register` — alta (`nombre`, `email`, `password`, `rol`: `anfitrion`|`buscador`)
- `POST /api/auth/login` — login
- `GET /api/auth/me` — perfil autenticado (rol, plan, verificado, custodia)
- `PUT /api/auth/me` — actualizar perfil
- `GET /api/casas` — listar/buscar (`ciudad`, `tipo`, `genero_ok`, `mascotas`, `precio_min/max`, `habitaciones_min`, `custodia_ok`, `busqueda`, paginación)
- `GET /api/casas/:id` — detalle (la dirección exacta solo la ve el anfitrión o quien tiene una visita confirmada)
- `POST /api/casas` — publicar casa (solo anfitriones; `fotos[]`, `amenities[]`, `custodia_ok`)
- `PUT /api/casas/:id` — editar casa (parcial, validado con Zod)
- `GET /api/favoritos` · `POST /api/favoritos/:casaId` · `DELETE /api/favoritos/:casaId`
- `GET /api/visitas` · `POST /api/visitas` · `PATCH /api/visitas/:id` (el solicitante solo puede cancelar; confirmar/completar es cosa del anfitrión)
- `GET /api/mensajes` · `GET /api/mensajes/:userId` · `POST /api/mensajes`
- `GET /api/config` — configuración pública del frontend (clave de Maps Embed si está configurada)
- `GET /health` — healthcheck

## Pantallas (17)

`onboarding_de_la_app`, `seleccion_de_rol`, `verificacion_de_identidad`, `register`, `login`, `explorar_casas`, `detalle_de_la_casa`, `busqueda_avanzada_con_custodia`, `mis_favoritos`, `mis_visitas`, `calendario_compartido`, `mensajes_y_afinidad`, `perfil_de_usuario_con_rol_diferenciado`, `publicar_casa_con_custodia`, `mapa_interactivo_de_casas` (con capa de zonas escolares), `planes_de_suscripcion`, `configuracion_de_notificaciones`.

Sírvidas en `/screens-static/<nombre>/code.html` (galería en `/gallery`). El rol se propaga desde la selección de rol (`localStorage.rehogar_rol`) al formulario de registro.

La **landing promocional** se sirve en `/` (`public/index.html`) y la home del prototipo en `/home` (`public/home.html`).

## Tests

```bash
npm test        # Jest con cobertura (33 casos: afinidad, match, mensajes, health, visitas)
```

La integración continua (`.github/workflows/ci.yml`) ejecuta en cada push y PR: `npm ci`, `npm run build` (tsc), `npm test` y `npm audit --omit=dev --audit-level=high`.
