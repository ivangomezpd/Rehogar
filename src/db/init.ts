import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const DB_PATH = process.env.DB_PATH || "./data/rehogar.db";
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'buscador' CHECK (rol IN ('buscador','anfitrion','ambos')),
    avatar TEXT, bio TEXT, verificado INTEGER NOT NULL DEFAULT 0,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','basic','premium')),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );
  
  CREATE TABLE IF NOT EXISTS perfiles (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    custodia TEXT, hijos_edades TEXT, genero TEXT, estilo_vida TEXT,
    preferencias TEXT, ciudad TEXT, lat REAL, lng REAL,
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );
  
  CREATE TABLE IF NOT EXISTS casas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anfitrion_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL, descripcion TEXT, ciudad TEXT NOT NULL,
    direccion TEXT, lat REAL, lng REAL, precio REAL NOT NULL,
    habitaciones INTEGER NOT NULL DEFAULT 1, banos INTEGER NOT NULL DEFAULT 1,
    m2 REAL, tipo TEXT, custodia_ok TEXT, genero_ok TEXT,
    mascotas INTEGER NOT NULL DEFAULT 0, amenities TEXT, fotos TEXT,
    activa INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );
  
  CREATE TABLE IF NOT EXISTS favoritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    casa_id INTEGER NOT NULL REFERENCES casas(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE (usuario_id, casa_id)
  );
  
  CREATE TABLE IF NOT EXISTS mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remitente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    receptor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    casa_id INTEGER REFERENCES casas(id) ON DELETE SET NULL,
    contenido TEXT NOT NULL, leido INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );
  
  CREATE TABLE IF NOT EXISTS visitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solicitante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    anfitrion_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    casa_id INTEGER NOT NULL REFERENCES casas(id) ON DELETE CASCADE,
    fecha TEXT NOT NULL, hora TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    notas TEXT, created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );
  
  CREATE INDEX IF NOT EXISTS idx_casas_ciudad ON casas(ciudad);
  CREATE INDEX IF NOT EXISTS idx_casas_precio ON casas(precio);
  CREATE INDEX IF NOT EXISTS idx_casas_activa ON casas(activa);
`);

const count = (db.prepare("SELECT COUNT(*) as n FROM usuarios").get() as any).n;
if (count === 0 && process.env.NODE_ENV === "development") {
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("password123", 10);
  db.prepare("INSERT INTO usuarios (nombre,email,password,rol,verificado,plan) VALUES (?,?,?,?,?,?)").run("Ana Garcia","ana@rehogar.com",hash,"buscador",1,"premium");
  db.prepare("INSERT INTO usuarios (nombre,email,password,rol,verificado,plan) VALUES (?,?,?,?,?,?)").run("Carlos Martin","carlos@rehogar.com",hash,"anfitrion",1,"basic");
  db.prepare("INSERT INTO perfiles (usuario_id) VALUES (?)").run(1);
  db.prepare("INSERT INTO perfiles (usuario_id) VALUES (?)").run(2);
  db.prepare("INSERT INTO casas (anfitrion_id,titulo,descripcion,ciudad,precio,habitaciones,banos,tipo,genero_ok,mascotas) VALUES (?,?,?,?,?,?,?,?,?,?)").run(2,"Piso luminoso en Malasana","Piso amplio en el corazon de Malasana. Ideal para persona organizada.","Madrid",750,2,1,"apartamento","mixto",0);
  db.prepare("INSERT INTO casas (anfitrion_id,titulo,descripcion,ciudad,precio,habitaciones,banos,tipo,genero_ok,mascotas) VALUES (?,?,?,?,?,?,?,?,?,?)").run(2,"Estudio cerca del mar","Estudio acogedor a 5 minutos de la playa.","Barcelona",620,1,1,"estudio","mujeres",1);
  console.log("Datos de prueba insertados");
}

console.log("Base de datos lista en:", DB_PATH);
export default db;