import { Router, Request, Response } from "express";
import db from "../db/init";
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from "../middleware/auth";
import { calcularAfinidad, parseTags, PerfilAfinidad } from "../utils/afinidad";

import { validate, schemas, parseJsonSeguro } from "../utils/validate";

const router = Router();

const LIMITE_POR_PAGINA = 100;

/**
 * Escapa los comodines de LIKE (% y _) y la propia barra de escape para que
 * una búsqueda de "100%" no haga matching contra cualquier cosa que empiece
 * por "100". Va junto a la cláusula ESCAPE '\' de cada LIKE.
 */
function likeSeguro(valor: unknown): string {
  return String(valor).replace(/[\\%_]/g, (m) => "\\" + m);
}

function cargarPerfilAfinidad(usuarioId: number): PerfilAfinidad | null {
  const row = db
    .prepare("SELECT custodia_patron, custodia_semana_par, num_hijos, estilo_vida_tags, busca_afinidad FROM perfiles WHERE usuario_id = ?")
    .get(usuarioId) as any;
  if (!row) return null;
  return {
    custodia_patron: row.custodia_patron,
    custodia_semana_par: row.custodia_semana_par,
    num_hijos: row.num_hijos || 0,
    estilo_vida_tags: parseTags(row.estilo_vida_tags),
    busca_afinidad: row.busca_afinidad,
  };
}

/**
 * Perfiles de afinidad de varios anfitriones en UNA consulta. La version anterior hacia
 * una consulta por casa (N+1) y, al ordenar por afinidad, sobre el conjunto completo
 * de resultados: no es un problema con 30 casas, si con 30.000.
 */
function cargarPerfilesAfinidad(usuarioIds: number[]): Map<number, PerfilAfinidad> {
  const mapa = new Map<number, PerfilAfinidad>();
  const unicos = [...new Set(usuarioIds)];
  if (!unicos.length) return mapa;
  const placeholders = unicos.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT usuario_id, custodia_patron, custodia_semana_par, num_hijos, estilo_vida_tags, busca_afinidad
       FROM perfiles WHERE usuario_id IN (${placeholders})`
    )
    .all(...unicos) as any[];
  for (const r of rows) {
    mapa.set(r.usuario_id, {
      custodia_patron: r.custodia_patron,
      custodia_semana_par: r.custodia_semana_par,
      num_hijos: r.num_hijos || 0,
      estilo_vida_tags: parseTags(r.estilo_vida_tags),
      busca_afinidad: r.busca_afinidad,
    });
  }
  return mapa;
}

router.get("/", optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
  const { ciudad, tipo, genero_ok, mascotas, precio_min, precio_max, habitaciones_min, custodia_ok, busqueda, orden, pagina = "1" } = req.query;
  // Los filtros numéricos venían del query string sin validar: Number("abc")
  // es NaN, better-sqlite3 lo enlaza sin error y el listado devolvía 0
  // resultados en silencio. Ahora el error es explícito.
  for (const [nombre, valor] of Object.entries({ precio_min, precio_max, habitaciones_min })) {
    if (valor !== undefined && !Number.isFinite(Number(valor))) {
      return res.status(400).json({ error: `Parámetro ${nombre} debe ser numérico` });
    }
  }
  const conditions: string[] = ["c.activa = 1"];
  const params: any[] = [];
  if (ciudad)        { conditions.push("c.ciudad LIKE ? ESCAPE '\\'");     params.push(`%${likeSeguro(ciudad)}%`); }
  if (tipo)          { conditions.push("c.tipo = ?");           params.push(tipo); }
  if (genero_ok)     { conditions.push("c.genero_ok = ?");      params.push(genero_ok); }
  if (mascotas)      { conditions.push("c.mascotas = ?");       params.push(mascotas === "true" ? 1 : 0); }
  if (precio_min)    { conditions.push("c.precio >= ?");        params.push(Number(precio_min)); }
  if (precio_max)    { conditions.push("c.precio <= ?");        params.push(Number(precio_max)); }
  if (habitaciones_min){ conditions.push("c.habitaciones >= ?");params.push(Number(habitaciones_min)); }
  if (custodia_ok)   { conditions.push("c.custodia_ok = ?");    params.push(custodia_ok); }
  if (busqueda)      { conditions.push("(c.titulo LIKE ? ESCAPE '\\' OR c.descripcion LIKE ? ESCAPE '\\')"); params.push(`%${likeSeguro(busqueda)}%`,`%${likeSeguro(busqueda)}%`); }
  const where = conditions.join(" AND ");

  // `limite` viene del query string sin validar: toparlo evita que un cliente pida
  // ?limite=1000000 y se trailing la tabla entera en memoria.
  const limite = Math.max(1, Math.min(Number(req.query.limite) || 20, LIMITE_POR_PAGINA));
  const paginaActual = Math.max(1, Number(pagina) || 1);

  const ordenarPorAfinidad = orden === "afinidad" && !!req.user;
  const propio = ordenarPorAfinidad ? cargarPerfilAfinidad(req.user!.id) : null;

  const total = (db.prepare(`SELECT COUNT(*) as n FROM casas c WHERE ${where}`).get(...params as []) as any).n;

  // Si se pide orden por afinidad, el score se calcula en memoria (logica de negocio en JS,
  // no SQL), asi que hay que traer los candidatos antes de paginar. Con el volumen del
  // proyecto es asumible; si creciera, el siguiente paso es una tabla materializada de
  // afinidad por (usuario, anfitrion) actualizada al editar el perfil.
  const offset = (paginaActual - 1) * limite;
  // `c.id DESC` como desempate: created_at es CURRENT_TIMESTAMP y tiene granularidad de
  // segundo, asi que sin un segundo criterio dos casas creadas en el mismo segundo mantienen
  // un orden arbitrario y el LIMIT/OFFSET puede repetir o saltar filas entre paginas.
  const baseQuery = `SELECT c.*, u.nombre as anfitrion_nombre, u.avatar as anfitrion_avatar, u.verificado as anfitrion_verificado
                      FROM casas c JOIN usuarios u ON u.id=c.anfitrion_id WHERE ${where} ORDER BY c.created_at DESC, c.id DESC`;

  let casas: any[];
  if (ordenarPorAfinidad && propio) {
    const todas = db.prepare(baseQuery).all(...params as []) as any[];
    const perfiles = cargarPerfilesAfinidad(todas.map((c) => c.anfitrion_id));
    casas = todas
      .map((c) => {
        const perfilAnfitrion = perfiles.get(c.anfitrion_id);
        const afinidad = perfilAnfitrion ? calcularAfinidad(propio, perfilAnfitrion) : null;
        return { ...c, afinidad: afinidad?.score ?? 0, afinidad_detalle: afinidad?.detalle ?? null };
      })
      .sort((a, b) => b.afinidad - a.afinidad)
      .slice(offset, offset + limite);
  } else {
    casas = db.prepare(`${baseQuery} LIMIT ? OFFSET ?`).all(...params as [], limite, offset) as any[];
  }

  casas.forEach(c => { if (c.fotos) c.fotos = parseJsonSeguro(c.fotos) || []; if (c.amenities) c.amenities = parseJsonSeguro(c.amenities) || []; });
  return res.json({ casas, paginacion: { total, pagina: paginaActual, limite, paginas: Math.ceil(total / limite) } });
});

router.get("/:id", optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
  const casa = db.prepare("SELECT c.*,u.nombre as anfitrion_nombre,u.avatar as anfitrion_avatar,u.bio as anfitrion_bio,u.verificado as anfitrion_verificado FROM casas c JOIN usuarios u ON u.id=c.anfitrion_id WHERE c.id=? AND c.activa=1").get(req.params.id) as any;
  if (!casa) return res.status(404).json({ error: "Casa no encontrada" });
  // La dirección exacta solo la ve el anfitrión o quien tiene una visita
  // confirmada/completada. Antes este endpoint era público y devolvía la
  // dirección (y lat/lng) de la casa de cualquiera que la hubiera publicado.
  const esAnfitrion = !!req.user && casa.anfitrion_id === req.user.id;
  let puedeVerUbicacion = esAnfitrion;
  if (!puedeVerUbicacion && req.user) {
    const visita = db.prepare("SELECT id FROM visitas WHERE casa_id=? AND solicitante_id=? AND estado IN ('confirmada','completada')").get(casa.id, req.user!.id);
    puedeVerUbicacion = !!visita;
  }
  if (!puedeVerUbicacion) { casa.direccion = null; casa.lat = null; casa.lng = null; }
  if (casa.fotos) casa.fotos = parseJsonSeguro(casa.fotos) || [];
  if (casa.amenities) casa.amenities = parseJsonSeguro(casa.amenities) || [];
  return res.json(casa);
});

router.post("/", authMiddleware, validate(schemas.casa), (req: AuthRequest, res: Response) => {
  if (req.user!.rol === "buscador") return res.status(403).json({ error: "Solo los anfitriones pueden publicar casas" });
  const { titulo, ciudad, precio, habitaciones = 1, banos = 1, tipo, genero_ok, mascotas = false, descripcion, amenities, fotos, custodia_ok } = req.body;
  const result = db.prepare("INSERT INTO casas (anfitrion_id,titulo,descripcion,ciudad,precio,habitaciones,banos,tipo,genero_ok,mascotas,amenities,fotos,custodia_ok) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(req.user!.id, titulo, descripcion||null, ciudad, precio, habitaciones, banos, tipo||null, genero_ok||null, mascotas?1:0, amenities?JSON.stringify(amenities):null, fotos?JSON.stringify(fotos):null, custodia_ok||null);
  return res.status(201).json({ id: result.lastInsertRowid, ok: true });
});

router.put("/:id", authMiddleware, validate(schemas.casaUpdate), (req: AuthRequest, res: Response) => {
  const casa = db.prepare("SELECT * FROM casas WHERE id=?").get(req.params.id) as any;
  if (!casa) return res.status(404).json({ error: "Casa no encontrada" });
  if (casa.anfitrion_id !== req.user!.id) return res.status(403).json({ error: "Sin permiso" });
  // SET dinámico a partir de las claves presentes en el body validado.
  // Sustituye al UPDATE con COALESCE(?, col): con COALESCE, precio=0 o
  // descripcion="" (valores falsy) no se podían guardar porque el ||null del
  // run los convertía en NULL y COALESCE mantenía el valor anterior.
  const data = req.body as Record<string, unknown>;
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, val: unknown) => { sets.push(`${col}=?`); params.push(val); };
  if (data.titulo !== undefined) set("titulo", data.titulo);
  if (data.descripcion !== undefined) set("descripcion", data.descripcion);
  if (data.ciudad !== undefined) set("ciudad", data.ciudad);
  if (data.precio !== undefined) set("precio", data.precio);
  if (data.habitaciones !== undefined) set("habitaciones", data.habitaciones);
  if (data.banos !== undefined) set("banos", data.banos);
  if (data.tipo !== undefined) set("tipo", data.tipo);
  if (data.genero_ok !== undefined) set("genero_ok", data.genero_ok);
  if (data.mascotas !== undefined) set("mascotas", data.mascotas ? 1 : 0);
  if (data.custodia_ok !== undefined) set("custodia_ok", data.custodia_ok);
  if (data.amenities !== undefined) set("amenities", JSON.stringify(data.amenities));
  if (data.fotos !== undefined) set("fotos", JSON.stringify(data.fotos));
  if (!sets.length) return res.json({ ok: true });
  db.prepare(`UPDATE casas SET ${sets.join(",")}, updated_at=datetime('now') WHERE id=?`).run(...params, req.params.id);
  return res.json({ ok: true });
});

router.delete("/:id", authMiddleware, (req: AuthRequest, res: Response) => {
  const casa = db.prepare("SELECT * FROM casas WHERE id=?").get(req.params.id) as any;
  if (!casa) return res.status(404).json({ error: "Casa no encontrada" });
  if (casa.anfitrion_id !== req.user!.id) return res.status(403).json({ error: "Sin permiso" });
  db.prepare("UPDATE casas SET activa=0,updated_at=datetime('now') WHERE id=?").run(req.params.id);
  return res.json({ ok: true });
});

export default router;
