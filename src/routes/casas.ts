import { Router, Request, Response } from "express";
import db from "../db/init";
import { authMiddleware, AuthRequest } from "../middleware/auth";

import { validate, schemas } from "../utils/validate";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const { ciudad, tipo, genero_ok, mascotas, precio_min, precio_max, habitaciones_min, busqueda, pagina = "1", limite = "20" } = req.query;
  const conditions: string[] = ["c.activa = 1"];
  const params: any[] = [];
  if (ciudad)        { conditions.push("c.ciudad LIKE ?");     params.push(`%${ciudad}%`); }
  if (tipo)          { conditions.push("c.tipo = ?");           params.push(tipo); }
  if (genero_ok)     { conditions.push("c.genero_ok = ?");      params.push(genero_ok); }
  if (mascotas)      { conditions.push("c.mascotas = ?");       params.push(mascotas === "true" ? 1 : 0); }
  if (precio_min)    { conditions.push("c.precio >= ?");        params.push(Number(precio_min)); }
  if (precio_max)    { conditions.push("c.precio <= ?");        params.push(Number(precio_max)); }
  if (habitaciones_min){ conditions.push("c.habitaciones >= ?");params.push(Number(habitaciones_min)); }
  if (busqueda)      { conditions.push("(c.titulo LIKE ? OR c.descripcion LIKE ?)"); params.push(`%${busqueda}%`,`%${busqueda}%`); }
  const where = conditions.join(" AND ");
  const offset = (Number(pagina) - 1) * Number(limite);
  const total = (db.prepare(`SELECT COUNT(*) as n FROM casas c WHERE ${where}`).get(...params as []) as any).n;
  const casas = db.prepare(`SELECT c.*,u.nombre as anfitrion_nombre,u.avatar as anfitrion_avatar,u.verificado as anfitrion_verificado FROM casas c JOIN usuarios u ON u.id=c.anfitrion_id WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`).all(...params as [], Number(limite), offset) as any[];
  casas.forEach(c => { if (c.fotos) c.fotos = JSON.parse(c.fotos); if (c.amenities) c.amenities = JSON.parse(c.amenities); });
  return res.json({ casas, paginacion: { total, pagina: Number(pagina), limite: Number(limite), paginas: Math.ceil(total/Number(limite)) } });
});

router.get("/:id", (req: Request, res: Response) => {
  const casa = db.prepare("SELECT c.*,u.nombre as anfitrion_nombre,u.avatar as anfitrion_avatar,u.bio as anfitrion_bio,u.verificado as anfitrion_verificado FROM casas c JOIN usuarios u ON u.id=c.anfitrion_id WHERE c.id=? AND c.activa=1").get(req.params.id) as any;
  if (!casa) return res.status(404).json({ error: "Casa no encontrada" });
  if (casa.fotos) casa.fotos = JSON.parse(casa.fotos || "[]");
  if (casa.amenities) casa.amenities = JSON.parse(casa.amenities || "[]");
  return res.json(casa);
});

router.post("/", authMiddleware, validate(schemas.casa), (req: AuthRequest, res: Response) => {
  if (req.user!.rol === "buscador") return res.status(403).json({ error: "Solo los anfitriones pueden publicar casas" });
  const { titulo, ciudad, precio, habitaciones = 1, banos = 1, tipo, genero_ok, mascotas = false, descripcion, amenities } = req.body;
  const result = db.prepare("INSERT INTO casas (anfitrion_id,titulo,descripcion,ciudad,precio,habitaciones,banos,tipo,genero_ok,mascotas,amenities) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(req.user!.id, titulo, descripcion||null, ciudad, precio, habitaciones, banos, tipo||null, genero_ok||null, mascotas?1:0, amenities?JSON.stringify(amenities):null);
  return res.status(201).json({ id: result.lastInsertRowid, ok: true });
});

router.put("/:id", authMiddleware, (req: AuthRequest, res: Response) => {
  const casa = db.prepare("SELECT * FROM casas WHERE id=?").get(req.params.id) as any;
  if (!casa) return res.status(404).json({ error: "Casa no encontrada" });
  if (casa.anfitrion_id !== req.user!.id) return res.status(403).json({ error: "Sin permiso" });
  const { titulo, descripcion, ciudad, precio, habitaciones, banos, tipo, genero_ok, mascotas } = req.body;
  db.prepare("UPDATE casas SET titulo=COALESCE(?,titulo),descripcion=COALESCE(?,descripcion),ciudad=COALESCE(?,ciudad),precio=COALESCE(?,precio),habitaciones=COALESCE(?,habitaciones),banos=COALESCE(?,banos),tipo=COALESCE(?,tipo),genero_ok=COALESCE(?,genero_ok),updated_at=datetime('now') WHERE id=?").run(titulo||null,descripcion||null,ciudad||null,precio||null,habitaciones||null,banos||null,tipo||null,genero_ok||null,req.params.id);
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
