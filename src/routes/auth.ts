import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import db from "../db/init";
import { authMiddleware, AuthRequest } from "../middleware/auth";

import { validate, schemas } from "../utils/validate";

const router = Router();

function signToken(user: any) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no configurado");
  return jwt.sign({ id: user.id, email: user.email, rol: user.rol, plan: user.plan }, secret, { expiresIn: "7d" } as any);
}

router.post("/register", validate(schemas.register), (req: Request, res: Response) => {
  const { nombre, email, password, rol = "buscador" } = req.body;
  if (db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email)) return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,?)").run(nombre, email, hash, rol);
  db.prepare("INSERT INTO perfiles (usuario_id) VALUES (?)").run(result.lastInsertRowid);
  const user = db.prepare("SELECT id,email,rol,plan FROM usuarios WHERE id=?").get(result.lastInsertRowid) as any;
  return res.status(201).json({ token: signToken(user), user: { id: user.id, nombre, email, rol, plan: user.plan } });
});

router.post("/login", validate(schemas.login), (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT id,nombre,email,password,rol,plan,verificado FROM usuarios WHERE email=?").get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Email o contrasena incorrectos" });
  const { password: _, ...safeUser } = user;
  return res.json({ token: signToken(safeUser), user: safeUser });
});

router.get("/me", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db.prepare("SELECT u.id,u.nombre,u.email,u.rol,u.plan,u.avatar,u.bio,u.verificado,p.ciudad,p.custodia FROM usuarios u LEFT JOIN perfiles p ON p.usuario_id=u.id WHERE u.id=?").get(req.user!.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  return res.json(user);
});

router.put("/me", authMiddleware, (req: AuthRequest, res: Response) => {
  const { nombre, bio, ciudad, custodia } = req.body;
  if (nombre) db.prepare("UPDATE usuarios SET nombre=?,updated_at=datetime('now') WHERE id=?").run(nombre, req.user!.id);
  if (bio !== undefined) db.prepare("UPDATE usuarios SET bio=? WHERE id=?").run(bio, req.user!.id);
  db.prepare("UPDATE perfiles SET ciudad=COALESCE(?,ciudad),custodia=COALESCE(?,custodia),updated_at=datetime('now') WHERE usuario_id=?").run(ciudad||null, custodia||null, req.user!.id);
  return res.json({ ok: true });
});

export default router;
