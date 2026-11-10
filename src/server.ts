import dotenv from "dotenv";
dotenv.config();

// El secreto se valida en TODOS los entornos (no solo producción): si solo se
// exigía en production, cualquier despliegue con NODE_ENV distinto arrancaba
// "bien" y fallaba con 500 en cada login. En test no se bloquea porque los
// suites fijan su propio secreto corto antes de importar nada.
const JWT_SECRET_EJEMPLO = "cambia-este-secreto-por-uno-seguro";
if (process.env.NODE_ENV !== "test") {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ CRÍTICO: JWT_SECRET no definido (copia .env.example a .env y genera uno)");
    process.exit(1);
  }
  if (secret === JWT_SECRET_EJEMPLO) {
    console.error("❌ CRÍTICO: JWT_SECRET es el valor de ejemplo de .env.example; genera uno real");
    process.exit(1);
  }
  if (secret.length < 16) {
    console.error("❌ CRÍTICO: JWT_SECRET demasiado corto (mínimo 16 caracteres)");
    process.exit(1);
  }
}
import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import fs from "fs";
import "./db/init";
import authRoutes from "./routes/auth";
import casasRoutes from "./routes/casas";
import favoritosRoutes from "./routes/favoritos";
import mensajesRoutes, { visitasRouter } from "./routes/mensajes";
import matchRoutes from "./routes/match";
import { logger } from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== "production";

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Detrás de un proxy (Vercel/Heroku/Nginx) todos los requests llegan con la
// IP del proxy y express-rate-limit limitaría a todo el mundo a la vez.
// TRUST_PROXY solo se activa con el flag del entorno: a ciegas permitiría
// spoofear X-Forwarded-For para saltarse los límites cuando NO hay proxy.
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));
app.use(cors({ origin: corsOrigins, credentials: true }));
// El límite global solo cubre /api: montado para toda la app contaba también
// los estáticos (17 pantallas, sus PNG y nav.js), y en producción el visitante
// agotaba las 100 requests/15min antes de terminar la galería.
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 10000 : 100, skip: () => isDev }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

if (process.env.NODE_ENV !== "test") {
  app.use((req, _res, next) => { logger.info(`${req.method} ${req.path}`); next(); });
}

app.use("/nav.js", express.static(path.join(__dirname,"..","public","nav.js")));
app.use("/uploads", express.static(path.join(__dirname,"..","public","uploads")));
app.use(express.static(path.join(__dirname,"..","public")));

const screensDir = path.join(__dirname,"..","screens");
app.use("/screens", express.static(screensDir));
app.use("/screens-static", express.static(screensDir));

app.use("/api/auth", authRoutes);
app.use("/api/casas", casasRoutes);
app.use("/api/favoritos", favoritosRoutes);
app.use("/api/mensajes", mensajesRoutes);
app.use("/api/visitas", visitasRouter);
app.use("/api/match", matchRoutes);

// Config pública para el frontend. La clave de Maps Embed es de cliente por
// naturaleza (viaja en el src del iframe), así que exponerla aquí no filtra
// nada que no acabe en el HTML; lo importante es que vive en el entorno y se
// puede restringir por referrer en Google Cloud, en lugar de hardcoded.
app.get("/api/config", (_req, res) => res.json({ maps_embed_key: process.env.GOOGLE_MAPS_EMBED_KEY || null }));

app.get("/health", (_req,res) => res.json({ status:"ok", env:process.env.NODE_ENV, ts:new Date().toISOString() }));
app.get("/gallery", (_req,res) => { const p=path.join(__dirname,"..","public","gallery.html"); fs.existsSync(p)?res.sendFile(p):res.status(404).send("Galeria no encontrada"); });
app.get("/home", (_req,res) => { const p=path.join(__dirname,"..","public","home.html"); fs.existsSync(p)?res.sendFile(p):res.status(404).send("Home no encontrada"); });
app.get("/", (_req,res) => { const p=path.join(__dirname,"..","public","index.html"); fs.existsSync(p)?res.sendFile(p):res.redirect("/gallery"); });
app.use((_req,res) => res.status(404).json({ error:"Ruta no encontrada" }));
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction) => { logger.error(err); res.status(500).json({ error:"Error interno del servidor" }); });

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n Rehogar en http://localhost:${PORT}`);
    console.log(` Galeria:  http://localhost:${PORT}/gallery`);
    console.log(` API:      http://localhost:${PORT}/api`);
    console.log(` Health:   http://localhost:${PORT}/health\n`);
  });
}

export default app;
