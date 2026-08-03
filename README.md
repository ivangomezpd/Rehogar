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

La app arranca en `http://localhost:3000` y crea la BD SQLite con datos de prueba (usuarios `ana@rehogar.com` / `carlos@rehogar.com`, ambos con contraseña `password123`).

## Configuración (`.env`)

| Variable    | Descripción                              | Ejemplo                |
|-------------|------------------------------------------|------------------------|
| `PORT`      | Puerto del servidor                      | `3000`                 |
| `NODE_ENV`  | `development` o `production`             | `development`          |
| `JWT_SECRET`| Secreto para firmar tokens               | 64 caracteres hex      |
| `DB_PATH`   | Ruta del archivo SQLite                  | `./data/rehogar.db`    |

En producción `JWT_SECRET` es obligatorio (el servidor aborta si falta).

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
- `GET /api/casas/:id` — detalle
- `POST /api/casas` — publicar casa (solo anfitriones; `fotos[]`, `amenities[]`, `custodia_ok`)
- `GET /api/favoritos` · `POST /api/favoritos/:casaId` · `DELETE /api/favoritos/:casaId`
- `GET /api/visitas` · `POST /api/visitas` · `PATCH /api/visitas/:id`
- `GET /api/mensajes` · `GET /api/mensajes/:userId` · `POST /api/mensajes`
- `GET /health` — healthcheck

## Pantallas (18)

`onboarding_de_la_app`, `seleccion_de_rol`, `verificacion_de_identidad`, `register`, `login`, `explorar_casas`, `detalle_de_la_casa`, `busqueda_avanzada_con_custodia`, `mis_favoritos`, `mis_visitas`, `calendario_compartido`, `mensajes_y_afinidad`, `perfil_de_usuario_con_rol_diferenciado`, `publicar_casa_con_custodia`, `mapa_interactivo_de_casas`, `mapa_con_zonas_escolares`, `planes_de_suscripcion`, `configuracion_de_notificaciones`.

Sírvidas en `/screens-static/<nombre>/code.html` (galería en `/gallery`). El rol se propaga desde la selección de rol (`localStorage.rehogar_rol`) al formulario de registro.

La **landing promocional** se sirve en `/` (`public/index.html`) y la home del prototipo en `/home` (`public/home.html`).

## Tests

Batería funcional (API + pantallas HTTP 200): `node C:\Users\igomez\AppData\Local\Temp\opencode\bateria.cjs` (requiere `REPO` apuntando a la raíz del repo).
