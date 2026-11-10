import { Router, Response } from "express";
import db from "../db/init";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { parseJsonSeguro } from "../utils/validate";

const router = Router();
router.use(authMiddleware);

router.get("/", (req: AuthRequest, res: Response) => {
  // Solo casas activas: un anfitrión que borra su casa no debería seguir
  // apareciendo en los favoritos de otros usuarios.
  const favs = db.prepare("SELECT c.*,u.nombre as anfitrion_nombre,f.created_at as guardado_en FROM favoritos f JOIN casas c ON c.id=f.casa_id JOIN usuarios u ON u.id=c.anfitrion_id WHERE f.usuario_id=? AND c.activa=1 ORDER BY f.created_at DESC").all(req.user!.id) as any[];
  favs.forEach(c => { if (c.fotos) c.fotos = parseJsonSeguro(c.fotos) || []; });
  return res.json(favs);
});

router.post("/:casaId", (req: AuthRequest, res: Response) => {
  if (!db.prepare("SELECT id FROM casas WHERE id=? AND activa=1").get(req.params.casaId)) return res.status(404).json({ error: "Casa no encontrada" });
  try {
    db.prepare("INSERT INTO favoritos (usuario_id,casa_id) VALUES (?,?)").run(req.user!.id, req.params.casaId);
    return res.status(201).json({ ok: true });
  } catch (e: any) {
    // Antes cualquier error de BD se disfrazaba de "Ya esta en favoritos".
    // Solo la violación de UNIQUE es ese caso.
    if (e && e.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "Ya esta en favoritos" });
    throw e;
  }
});

router.delete("/:casaId", (req: AuthRequest, res: Response) => {
  db.prepare("DELETE FROM favoritos WHERE usuario_id=? AND casa_id=?").run(req.user!.id, req.params.casaId);
  return res.json({ ok: true });
});

export default router;
