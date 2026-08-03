import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ CRÍTICO: JWT_SECRET no definido en producción');
  process.exit(1);
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
import { logger } from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== "production";

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 10000 : 100, skip: () => isDev }));
app.use(express.json({ limit: "10mb" }));
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

app.get("/health", (_req,res) => res.json({ status:"ok", env:process.env.NODE_ENV, ts:new Date().toISOString() }));
app.get("/gallery", (_req,res) => { const p=path.join(__dirname,"..","public","gallery.html"); fs.existsSync(p)?res.sendFile(p):res.status(404).send("Galeria no encontrada"); });
app.get("/home", (_req,res) => { const p=path.join(__dirname,"..","public","home.html"); fs.existsSync(p)?res.sendFile(p):res.status(404).send("Home no encontrada"); });
app.get("/", (_req,res) => { const p=path.join(__dirname,"..","index.html"); fs.existsSync(p)?res.sendFile(p):res.redirect("/gallery"); });
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
