import { Router, Response } from "express";
import db from "../db/init";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validate, schemas } from "../utils/validate";

const router = Router();
router.use(authMiddleware);

router.get("/", (req: AuthRequest, res: Response) => {
  const msgs = db.prepare("SELECT CASE WHEN m.remitente_id=? THEN m.receptor_id ELSE m.remitente_id END as otro_id, u.nombre as otro_nombre, u.avatar as otro_avatar, MAX(m.created_at) as ultimo_fecha, m.contenido as ultimo_mensaje FROM mensajes m JOIN usuarios u ON u.id=CASE WHEN m.remitente_id=? THEN m.receptor_id ELSE m.remitente_id END WHERE m.remitente_id=? OR m.receptor_id=? GROUP BY otro_id ORDER BY ultimo_fecha DESC").all(req.user!.id,req.user!.id,req.user!.id,req.user!.id);
  return res.json(msgs);
});

router.get("/:userId", (req: AuthRequest, res: Response) => {
  const msgs = db.prepare("SELECT m.*,u.nombre as remitente_nombre FROM mensajes m JOIN usuarios u ON u.id=m.remitente_id WHERE (m.remitente_id=? AND m.receptor_id=?) OR (m.remitente_id=? AND m.receptor_id=?) ORDER BY m.created_at ASC LIMIT 100").all(req.user!.id,req.params.userId,req.params.userId,req.user!.id);
  db.prepare("UPDATE mensajes SET leido=1 WHERE receptor_id=? AND remitente_id=?").run(req.user!.id,req.params.userId);
  return res.json(msgs);
});

router.post("/", validate(schemas.mensaje), (req: AuthRequest, res: Response) => {
  const { receptor_id, contenido, casa_id } = req.body;
  const result = db.prepare("INSERT INTO mensajes (remitente_id,receptor_id,casa_id,contenido) VALUES (?,?,?,?)").run(req.user!.id,receptor_id,casa_id||null,contenido.trim());
  return res.status(201).json({ id: result.lastInsertRowid, ok: true });
});

export const visitasRouter = Router();
visitasRouter.use(authMiddleware);

visitasRouter.get("/", (req: AuthRequest, res: Response) => {
  const v = db.prepare("SELECT v.*,s.nombre as solicitante_nombre,a.nombre as anfitrion_nombre,c.titulo as casa_titulo FROM visitas v JOIN usuarios s ON s.id=v.solicitante_id JOIN usuarios a ON a.id=v.anfitrion_id JOIN casas c ON c.id=v.casa_id WHERE v.solicitante_id=? OR v.anfitrion_id=? ORDER BY v.fecha DESC").all(req.user!.id,req.user!.id);
  return res.json(v);
});

visitasRouter.post("/", validate(schemas.visita), (req: AuthRequest, res: Response) => {
  const { casa_id, fecha, hora, notas } = req.body;
  const casa = db.prepare("SELECT anfitrion_id FROM casas WHERE id=? AND activa=1").get(casa_id) as any;
  if (!casa) return res.status(404).json({ error: "Casa no encontrada" });
  const result = db.prepare("INSERT INTO visitas (solicitante_id,anfitrion_id,casa_id,fecha,hora,notas) VALUES (?,?,?,?,?,?)").run(req.user!.id,casa.anfitrion_id,casa_id,fecha,hora,notas||null);
  return res.status(201).json({ id: result.lastInsertRowid, ok: true });
});

visitasRouter.patch("/:id", (req: AuthRequest, res: Response) => {
  const { estado } = req.body;
  if (!["pendiente","confirmada","cancelada","completada"].includes(estado)) return res.status(400).json({ error: "Estado invalido" });
  const v = db.prepare("SELECT * FROM visitas WHERE id=?").get(req.params.id) as any;
  if (!v) return res.status(404).json({ error: "Visita no encontrada" });
  if (v.solicitante_id !== req.user!.id && v.anfitrion_id !== req.user!.id) return res.status(403).json({ error: "Sin permiso" });
  db.prepare("UPDATE visitas SET estado=? WHERE id=?").run(estado,req.params.id);
  return res.json({ ok: true });
});

export default router;
