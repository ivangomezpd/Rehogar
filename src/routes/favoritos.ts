import { Router, Response } from "express";
import db from "../db/init";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", (req: AuthRequest, res: Response) => {
  const favs = db.prepare("SELECT c.*,u.nombre as anfitrion_nombre,f.created_at as guardado_en FROM favoritos f JOIN casas c ON c.id=f.casa_id JOIN usuarios u ON u.id=c.anfitrion_id WHERE f.usuario_id=? ORDER BY f.created_at DESC").all(req.user!.id) as any[];
  favs.forEach(c => { if (c.fotos) c.fotos = JSON.parse(c.fotos); });
  return res.json(favs);
});

router.post("/:casaId", (req: AuthRequest, res: Response) => {
  if (!db.prepare("SELECT id FROM casas WHERE id=? AND activa=1").get(req.params.casaId)) return res.status(404).json({ error: "Casa no encontrada" });
  try {
    db.prepare("INSERT INTO favoritos (usuario_id,casa_id) VALUES (?,?)").run(req.user!.id, req.params.casaId);
    return res.status(201).json({ ok: true });
  } catch { return res.status(409).json({ error: "Ya esta en favoritos" }); }
});

router.delete("/:casaId", (req: AuthRequest, res: Response) => {
  db.prepare("DELETE FROM favoritos WHERE usuario_id=? AND casa_id=?").run(req.user!.id, req.params.casaId);
  return res.json({ ok: true });
});

export default router;
