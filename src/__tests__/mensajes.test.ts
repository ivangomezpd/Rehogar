import request from 'supertest';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Misma razón que en match.test.ts: src/server abre el SQLite leyendo DB_PATH en
// tiempo de import, así que el env se fija antes de los require() y la BD de test
// se borra antes de abrirla para no chocar con los INSERT de la corrida anterior.
const DB_PATH = './data/test-mensajes.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-de-test';
process.env.DB_PATH = DB_PATH;

for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
  if (fs.existsSync(f)) fs.rmSync(f, { force: true });
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const app = require('../server').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../db/init').default;

function crearUsuario(nombre: string, email: string, rol: string) {
  const r = db
    .prepare("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,?)")
    .run(nombre, email, 'x', rol);
  db.prepare("INSERT INTO perfiles (usuario_id) VALUES (?)").run(r.lastInsertRowid);
  return Number(r.lastInsertRowid);
}

function token(id: number, rol: string) {
  return jwt.sign({ id, email: 'x@test.local', rol, plan: 'free' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  } as any);
}

let emisor: number;
let receptor: number;
let auth: string;

beforeAll(() => {
  emisor = crearUsuario('Emisor', 'emisor@test.local', 'buscador');
  receptor = crearUsuario('Receptor', 'receptor@test.local', 'anfitrion');
  auth = `Bearer ${token(emisor, 'buscador')}`;
});

describe('POST /api/mensajes (contenido vacio)', () => {
  it('rechaza un cuerpo de solo espacios', async () => {
    const r = await request(app).post('/api/mensajes').set('Authorization', auth).send({ receptor_id: receptor, contenido: '   ' });
    expect(r.status).toBe(400);
  });

  it('rechaza tabuladores y saltos como único contenido', async () => {
    const r = await request(app).post('/api/mensajes').set('Authorization', auth).send({ receptor_id: receptor, contenido: ' \t\n ' });
    expect(r.status).toBe(400);
  });

  it('rechaza la cadena vacia', async () => {
    const r = await request(app).post('/api/mensajes').set('Authorization', auth).send({ receptor_id: receptor, contenido: '' });
    expect(r.status).toBe(400);
  });

  it('guarda el texto real aunque tenga espacios alrededor', async () => {
    const r = await request(app).post('/api/mensajes').set('Authorization', auth).send({ receptor_id: receptor, contenido: '  hola  ' });
    expect(r.status).toBe(201);
    const fila = db.prepare('SELECT contenido FROM mensajes WHERE id=?').get(r.body.id) as any;
    // El trim del schema y el de la ruta coinciden: sin doble recorte ni espacio final.
    expect(fila.contenido).toBe('hola');
  });

  it('no se queda ningun mensaje vacio en la base de datos', async () => {
    const vacios = db.prepare("SELECT COUNT(*) as n FROM mensajes WHERE TRIM(contenido) = ''").get() as any;
    expect(vacios.n).toBe(0);
  });
});
