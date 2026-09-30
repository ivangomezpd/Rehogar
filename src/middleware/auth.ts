import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; rol: string; plan: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET no configurado");
    const payload = jwt.verify(header.split(" ")[1], secret) as any;
    req.user = { id: payload.id, email: payload.email, rol: payload.rol, plan: payload.plan };
    next();
  } catch {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }
}

/**
 * Igual que authMiddleware pero no bloquea la petición si no hay token o es inválido:
 * simplemente deja req.user sin definir. Útil en endpoints públicos (como la búsqueda
 * de casas) que quieren personalizar la respuesta (ej. orden por afinidad) solo cuando
 * el usuario está autenticado.
 */
export function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const payload = jwt.verify(header.split(" ")[1], secret) as any;
        req.user = { id: payload.id, email: payload.email, rol: payload.rol, plan: payload.plan };
      }
    } catch {
      // token inválido/expirado: seguimos sin usuario autenticado, sin cortar la petición
    }
  }
  next();
}
