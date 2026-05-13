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

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== "production";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(rateLimit({ windowMs: 15*60*1000, max: isDev ? 10000 : 100, skip: () => isDev }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

if (isDev) app.use((req,_res,next) => { console.log(`${new Date().toISOString().slice(11,19)} ${req.method} ${req.path}`); next(); });

app.use("/nav.js", express.static(path.join(__dirname,"..","public","nav.js")));
app.use("/uploads", express.static(path.join(__dirname,"..","public","uploads")));
app.use(express.static(path.join(__dirname,"..","public")));

const screensDir = path.join(__dirname,"..","Rehogar","screens");
app.use("/screens-static", express.static(fs.existsSync(screensDir) ? screensDir : path.join(__dirname,"..","screens")));

app.use("/api/auth", authRoutes);
app.use("/api/casas", casasRoutes);
app.use("/api/favoritos", favoritosRoutes);
app.use("/api/mensajes", mensajesRoutes);
app.use("/api/visitas", visitasRouter);

app.get("/health", (_req,res) => res.json({ status:"ok", env:process.env.NODE_ENV, ts:new Date().toISOString() }));
app.get("/gallery", (_req,res) => { const p=path.join(__dirname,"..","public","gallery.html"); fs.existsSync(p)?res.sendFile(p):res.status(404).send("Galeria no encontrada"); });
app.get("/", (_req,res) => { const p=path.join(__dirname,"..","index.html"); fs.existsSync(p)?res.sendFile(p):res.redirect("/gallery"); });
app.use((_req,res) => res.status(404).json({ error:"Ruta no encontrada" }));
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction) => { console.error(err); res.status(500).json({ error:isDev?err.message:"Error interno" }); });

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n Rehogar en http://localhost:${PORT}`);
    console.log(` Galeria:  http://localhost:${PORT}/gallery`);
    console.log(` API:      http://localhost:${PORT}/api`);
    console.log(` Health:   http://localhost:${PORT}/health\n`);
  });
}

export default app;
