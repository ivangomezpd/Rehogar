import request from 'supertest';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Misma razón que en match.test.ts y mensajes.test.ts: src/server abre el
// SQLite leyendo DB_PATH en tiempo de import, así que el env se fija antes
// de los require() y la BD de test se borra antes de abrirla.
const DB_PATH = './data/test-visitas.db';
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

let anfitrion: number;
let solicitante: number;
let casaId: number;
let visitaId: number;
let authAnfitrion: string;
let authSolicitante: string;

beforeAll(() => {
  anfitrion = crearUsuario('Anfitrion', 'anfitrion@test.local', 'anfitrion');
  solicitante = crearUsuario('Solicitante', 'solicitante@test.local', 'buscador');
  const casa = db
    .prepare("INSERT INTO casas (anfitrion_id,titulo,ciudad,precio) VALUES (?,?,?,?)")
    .run(anfitrion, 'Piso test', 'Madrid', 700);
  casaId = Number(casa.lastInsertRowid);
  const visita = db
    .prepare("INSERT INTO visitas (solicitante_id,anfitrion_id,casa_id,fecha,hora) VALUES (?,?,?,?,?)")
    .run(solicitante, anfitrion, casaId, '2030-01-15', '10:00');
  visitaId = Number(visita.lastInsertRowid);
  authAnfitrion = `Bearer ${token(anfitrion, 'anfitrion')}`;
  authSolicitante = `Bearer ${token(solicitante, 'buscador')}`;
});

describe('PATCH /api/visitas/:id (transiciones por rol)', () => {
  it('el solicitante NO puede confirmarse la visita a si mismo', async () => {
    const r = await request(app)
      .patch(`/api/visitas/${visitaId}`)
      .set('Authorization', authSolicitante)
      .send({ estado: 'confirmada' });
    expect(r.status).toBe(403);
  });

  it('el solicitante tampoco puede marcarla completada', async () => {
    const r = await request(app)
      .patch(`/api/visitas/${visitaId}`)
      .set('Authorization', authSolicitante)
      .send({ estado: 'completada' });
    expect(r.status).toBe(403);
  });

  it('el solicitante SI puede cancelarla', async () => {
    const r = await request(app)
      .patch(`/api/visitas/${visitaId}`)
      .set('Authorization', authSolicitante)
      .send({ estado: 'cancelada' });
    expect(r.status).toBe(200);
  });

  it('el anfitrion SI puede confirmarla', async () => {
    // Reactivar la visita para el resto del flujo
    db.prepare("UPDATE visitas SET estado='pendiente' WHERE id=?").run(visitaId);
    const r = await request(app)
      .patch(`/api/visitas/${visitaId}`)
      .set('Authorization', authAnfitrion)
      .send({ estado: 'confirmada' });
    expect(r.status).toBe(200);
    const v = db.prepare('SELECT estado FROM visitas WHERE id=?').get(visitaId) as any;
    expect(v.estado).toBe('confirmada');
  });

  it('un usuario ajeno a la visita no puede tocarla', async () => {
    const tercero = crearUsuario('Tercero', 'tercero@test.local', 'buscador');
    const r = await request(app)
      .patch(`/api/visitas/${visitaId}`)
      .set('Authorization', `Bearer ${token(tercero, 'buscador')}`)
      .send({ estado: 'cancelada' });
    expect(r.status).toBe(403);
  });
});

describe('POST /api/mensajes (validacion de receptor y casa)', () => {
  it('rechaza un receptor que no existe con 404, no con 500 por la FK', async () => {
    const r = await request(app)
      .post('/api/mensajes')
      .set('Authorization', authSolicitante)
      .send({ receptor_id: 99999, contenido: 'hola' });
    expect(r.status).toBe(404);
  });

  it('rechaza escribirse a uno mismo', async () => {
    const r = await request(app)
      .post('/api/mensajes')
      .set('Authorization', authSolicitante)
      .send({ receptor_id: solicitante, contenido: 'hola' });
    expect(r.status).toBe(400);
  });

  it('rechaza un casa_id inexistente con 404', async () => {
    const r = await request(app)
      .post('/api/mensajes')
      .set('Authorization', authSolicitante)
      .send({ receptor_id: anfitrion, contenido: 'hola', casa_id: 99999 });
    expect(r.status).toBe(404);
  });

  it('acepta un mensaje a un receptor real', async () => {
    const r = await request(app)
      .post('/api/mensajes')
      .set('Authorization', authSolicitante)
      .send({ receptor_id: anfitrion, contenido: 'hola, me interesa tu piso' });
    expect(r.status).toBe(201);
  });
});

describe('GET /api/casas/:id (direccion oculta)', () => {
  it('sin token no devuelve direccion ni coordenadas', async () => {
    const r = await request(app).get(`/api/casas/${casaId}`);
    expect(r.status).toBe(200);
    expect(r.body.direccion).toBeNull();
    expect(r.body.lat).toBeNull();
    expect(r.body.lng).toBeNull();
  });

  it('un buscador sin visita confirmada tampoco las ve', async () => {
    db.prepare("UPDATE visitas SET estado='pendiente' WHERE id=?").run(visitaId);
    const r = await request(app).get(`/api/casas/${casaId}`).set('Authorization', authSolicitante);
    expect(r.status).toBe(200);
    expect(r.body.direccion).toBeNull();
  });

  it('con visita confirmada el solicitante SI ve la direccion', async () => {
    db.prepare("UPDATE casas SET direccion='Calle Falsa 123' WHERE id=?").run(casaId);
    db.prepare("UPDATE visitas SET estado='confirmada' WHERE id=?").run(visitaId);
    const r = await request(app).get(`/api/casas/${casaId}`).set('Authorization', authSolicitante);
    expect(r.status).toBe(200);
    expect(r.body.direccion).toBe('Calle Falsa 123');
  });

  it('el anfitrion siempre ve su propia direccion', async () => {
    const r = await request(app).get(`/api/casas/${casaId}`).set('Authorization', authAnfitrion);
    expect(r.status).toBe(200);
    expect(r.body.direccion).toBe('Calle Falsa 123');
  });
});

describe('PUT /api/casas/:id (validacion y campos)', () => {
  it('rechaza body invalido con 400', async () => {
    const r = await request(app)
      .put(`/api/casas/${casaId}`)
      .set('Authorization', authAnfitrion)
      .send({ titulo: 'x' });
    expect(r.status).toBe(400);
  });

  it('actualiza campos que antes se ignoraban (custodia_ok, mascotas, amenities)', async () => {
    const r = await request(app)
      .put(`/api/casas/${casaId}`)
      .set('Authorization', authAnfitrion)
      .send({ custodia_ok: 'fin_de_semana', mascotas: true, amenities: ['terraza'] });
    expect(r.status).toBe(200);
    const casa = db.prepare('SELECT custodia_ok, mascotas, amenities FROM casas WHERE id=?').get(casaId) as any;
    expect(casa.custodia_ok).toBe('fin_de_semana');
    expect(casa.mascotas).toBe(1);
    expect(JSON.parse(casa.amenities)).toEqual(['terraza']);
  });

  it('permite vaciar la descripcion (el COALESCE antiguo lo impedia)', async () => {
    db.prepare("UPDATE casas SET descripcion='texto viejo' WHERE id=?").run(casaId);
    const r = await request(app)
      .put(`/api/casas/${casaId}`)
      .set('Authorization', authAnfitrion)
      .send({ descripcion: '' });
    expect(r.status).toBe(200);
    const casa = db.prepare('SELECT descripcion FROM casas WHERE id=?').get(casaId) as any;
    expect(casa.descripcion).toBe('');
  });

  it('un no-anfitrion ajeno recibe 403', async () => {
    const r = await request(app)
      .put(`/api/casas/${casaId}`)
      .set('Authorization', authSolicitante)
      .send({ titulo: 'Piso hackeado' });
    expect(r.status).toBe(403);
  });
});

describe('GET /api/casas (query params)', () => {
  it('precio_min no numerico devuelve 400, no cero resultados silenciosos', async () => {
    const r = await request(app).get('/api/casas?precio_min=abc');
    expect(r.status).toBe(400);
  });

  it('escapa los comodines del LIKE: buscar "100%" no matchea todo', async () => {
    db.prepare("INSERT INTO casas (anfitrion_id,titulo,ciudad,precio) VALUES (?,?,?,?)").run(anfitrion, 'Piso 100', 'Madrid', 500);
    const r = await request(app).get('/api/casas?busqueda=100%25');
    expect(r.status).toBe(200);
    // Sin escape, "100%" es un patron LIKE que casa con cualquier titulo que
    // contenga "100" (en este caso "Piso 100"). Con ESCAPE '\' solo puede
    // matchear el literal "100%", que no existe.
    expect(r.body.casas.length).toBe(0);
  });
});
