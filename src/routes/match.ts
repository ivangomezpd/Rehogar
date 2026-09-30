import { Router, Response } from "express";
import db from "../db/init";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { calcularAfinidad, parseTags, PerfilAfinidad } from "../utils/afinidad";

const router = Router();

const SELECT_PERFIL = "SELECT custodia_patron, custodia_semana_par, num_hijos, estilo_vida_tags, busca_afinidad FROM perfiles WHERE usuario_id = ?";

function aPerfil(row: any): PerfilAfinidad {
  return {
    custodia_patron: row.custodia_patron,
    custodia_semana_par: row.custodia_semana_par,
    num_hijos: row.num_hijos || 0,
    estilo_vida_tags: parseTags(row.estilo_vida_tags),
    busca_afinidad: row.busca_afinidad,
  };
}

function cargarPerfil(usuarioId: number): PerfilAfinidad | null {
  const row = db.prepare(SELECT_PERFIL).get(usuarioId) as any;
  if (!row) return null;
  return aPerfil(row);
}

/**
 * Carga varios perfiles de una sola vez (evita el N+1: una consulta por usuario).
 * Devuelve un Map id -> PerfilAfinidad con solo los que existen.
 */
function cargarPerfiles(usuarioIds: number[]): Map<number, PerfilAfinidad> {
  const resultado = new Map<number, PerfilAfinidad>();
  if (!usuarioIds.length) return resultado;
  const placeholders = usuarioIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT usuario_id, custodia_patron, custodia_semana_par, num_hijos, estilo_vida_tags, busca_afinidad
       FROM perfiles WHERE usuario_id IN (${placeholders})`
    )
    .all(...usuarioIds) as any[];
  for (const row of rows) resultado.set(row.usuario_id, aPerfil(row));
  return resultado;
}

/**
 * Persiste el último score calculado por cada pareja de usuarios.
 * OJO: es un registro para analítica, NO una caché de lectura. El camino caliente
 * (`calcularAfinidad` en memoria) es tan barato —5 campos, sin I/O— que leer de aquí
 * solo introduciría scores obsoletos cuando alguien edita su custodia o sus tags.
 */
function registrarAfinidad(a: number, b: number, score: number, detalle: unknown) {
  const [x, y] = a < b ? [a, b] : [b, a];
  db.prepare(
    `INSERT INTO afinidad (usuario_a_id, usuario_b_id, score, detalle, calculado_at)
     VALUES (?,?,?,?,datetime('now'))
     ON CONFLICT(usuario_a_id, usuario_b_id) DO UPDATE SET score=excluded.score, detalle=excluded.detalle, calculado_at=excluded.calculado_at`
  ).run(x, y, score, JSON.stringify(detalle));
}

// GET /api/match/candidatos/lista — otros usuarios ordenados por afinidad con el usuario autenticado
// (Registrada ANTES de /:usuarioId a propósito: si no, Express interpretaría "candidatos"
// como un valor de :usuarioId y esta ruta nunca se alcanzaría.)
router.get("/candidatos/lista", authMiddleware, (req: AuthRequest, res: Response) => {
  const propio = cargarPerfil(req.user!.id);
  if (!propio) return res.status(404).json({ error: "Completa tu perfil para ver candidatos" });

  const limite = Math.max(1, Math.min(Number(req.query.limite) || 20, 50));

  // `busca_afinidad` describe lo que busca CADA usuario, no un filtro aplicable al otro:
  // el esquema no guarda el estado civil, así que no se puede usar para excluir a nadie.
  // (El filtro anterior `busca_afinidad != 'indiferente' OR busca_afinidad IS NULL` además
  // tenía un bug de precedencia AND/OR y descartaba de un plumazo a todos los usuarios
  // con el valor por defecto 'indiferente', que son la mayoría tras el registro.)
  const candidatos = db
    .prepare(
      `SELECT u.id, u.nombre, u.avatar, u.verificado, u.rol, p.ciudad
       FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
       WHERE u.id != ?
       ORDER BY u.id`
    )
    .all(req.user!.id) as any[];

  const perfiles = cargarPerfiles(candidatos.map((c) => c.id));

  const resultados = candidatos
    .map((c) => {
      const perfilOtro = perfiles.get(c.id);
      if (!perfilOtro) return null;
      const { score, detalle } = calcularAfinidad(propio, perfilOtro);
      return {
        usuario_id: c.id,
        nombre: c.nombre,
        avatar: c.avatar,
        verificado: c.verificado,
        rol: c.rol,
        ciudad: c.ciudad,
        score,
        detalle,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);

  return res.json({ candidatos: resultados });
});

// GET /api/match?ids=3,5,7 — afinidad contra varios usuarios de una sola llamada.
// Evita que la lista de mensajes dispare una petición HTTP por conversación (N+1 de red).
router.get("/", authMiddleware, (req: AuthRequest, res: Response) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0 && n !== req.user!.id)
    .slice(0, 50);

  if (!ids.length) return res.json({ afinidades: {} });

  const propio = cargarPerfil(req.user!.id);
  if (!propio) return res.json({ afinidades: {} });

  const perfiles = cargarPerfiles(ids);
  const afinidades: Record<string, { score: number; detalle: unknown }> = {};
  for (const id of ids) {
    const otro = perfiles.get(id);
    if (!otro) continue;
    afinidades[String(id)] = calcularAfinidad(propio, otro);
  }

  return res.json({ afinidades });
});

// GET /api/match/:usuarioId — score y desglose entre el usuario autenticado y otro usuario
router.get("/:usuarioId", authMiddleware, (req: AuthRequest, res: Response) => {
  const otroId = Number(req.params.usuarioId);
  if (!Number.isInteger(otroId)) return res.status(400).json({ error: "ID de usuario inválido" });
  if (otroId === req.user!.id) return res.status(400).json({ error: "No puedes calcular afinidad contigo mismo" });

  const propio = cargarPerfil(req.user!.id);
  const otro = cargarPerfil(otroId);
  if (!propio || !otro) return res.status(404).json({ error: "Perfil no encontrado" });

  const resultado = calcularAfinidad(propio, otro);
  registrarAfinidad(req.user!.id, otroId, resultado.score, resultado.detalle);

  return res.json({ usuario_id: otroId, ...resultado });
});

export default router;
