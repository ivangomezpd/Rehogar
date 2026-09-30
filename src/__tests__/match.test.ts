import request from 'supertest';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// El server importa src/db/init, que abre el SQLite usando DB_PATH leido en tiempo de
// import. Por eso el env se fija ANTES de los require() y la BD de test se borra antes
// de abrirla (si no, los INSERT de cada corrida chocarían con los de la anterior).
const DB_PATH = './data/test-match.db';
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

// Ana: semana alterna impar, 2 hijos, 3 tags.
// Carlos: semana alterna par, 1 hijo, 2 tags -> semanas complementarias = afinidad maxima.
const ANA = { nombre: 'Ana', email: 'ana@test.local', rol: 'buscador' };
const CARLOS = { nombre: 'Carlos', email: 'carlos@test.local', rol: 'anfitrion' };
const LAURA = { nombre: 'Laura', email: 'laura@test.local', rol: 'anfitrion' };

function crearUsuario(u: { nombre: string; email: string; rol: string }) {
  const r = db
    .prepare("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,?)")
    .run(u.nombre, u.email, 'x', u.rol);
  db.prepare("INSERT INTO perfiles (usuario_id) VALUES (?)").run(r.lastInsertRowid);
  return Number(r.lastInsertRowid);
}

function guardarPerfil(usuarioId: number, datos: Record<string, unknown>) {
  const campos = Object.keys(datos);
  db.prepare(
    `UPDATE perfiles SET ${campos.map((c) => `${c}=?`).join(', ')} WHERE usuario_id=?`
  ).run(...(campos.map((c) => datos[c]) as any[]), usuarioId);
}

function token(id: number, rol: string) {
  return jwt.sign({ id, email: 'x@test.local', rol, plan: 'free' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  } as any);
}

function crearCasa(anfitrionId: number, titulo: string) {
  const r = db
    .prepare("INSERT INTO casas (anfitrion_id,titulo,ciudad,precio,habitaciones) VALUES (?,?,?,?,?)")
    .run(anfitrionId, titulo, 'Madrid', 700, 2);
  return Number(r.lastInsertRowid);
}

let anaId: number;
let carlosId: number;
let lauraId: number;
let casaCarlos: number;
let casaLaura: number;

beforeAll(() => {
  anaId = crearUsuario(ANA);
  carlosId = crearUsuario(CARLOS);
  lauraId = crearUsuario(LAURA);

  guardarPerfil(anaId, {
    custodia_patron: 'semana_alterna',
    custodia_semana_par: 1,
    num_hijos: 2,
    estilo_vida_tags: JSON.stringify(['con_hijos', 'tranquilo', 'no_fumador']),
    busca_afinidad: 'indiferente',
  });
  guardarPerfil(carlosId, {
    custodia_patron: 'semana_alterna',
    custodia_semana_par: 0,
    num_hijos: 1,
    estilo_vida_tags: JSON.stringify(['con_hijos', 'tranquilo']),
    busca_afinidad: 'indiferente',
  });
  // Laura se queda con perfil nuevo: 0 hijos, sin custodia, sin tags -> afinidad 0.
  guardarPerfil(lauraId, { num_hijos: 0, busca_afinidad: 'indiferente' });

  casaCarlos = crearCasa(carlosId, 'Piso de Carlos');
  casaLaura = crearCasa(lauraId, 'Casa de Laura');
});

// Ana(2h, 3 tags) vs Carlos(1h, 2 tags) -> 45 custodia + 25 hijos + round(2/3*30)=20 estilo = 90
const AFINIDAD_ANA_CARLOS = 90;

describe('GET /api/match/:usuarioId', () => {
  it('devuelve 401 sin token', async () => {
    const r = await request(app).get(`/api/match/${carlosId}`);
    expect(r.status).toBe(401);
  });

  it('calcula el score y el desglose con custodia complementaria', async () => {
    const r = await request(app)
      .get(`/api/match/${carlosId}`)
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`);
    expect(r.status).toBe(200);
    expect(r.body.usuario_id).toBe(carlosId);
    expect(r.body.score).toBe(AFINIDAD_ANA_CARLOS);
    expect(r.body.detalle).toMatchObject({ custodia: 45, hijos: 25, estilo_vida: 20, complementario_calendario: true });
  });

  it('rechaza calcular afinidad con uno mismo', async () => {
    const r = await request(app)
      .get(`/api/match/${anaId}`)
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`);
    expect(r.status).toBe(400);
  });

  it('persiste el par en la tabla de afinidad', async () => {
    await request(app)
      .get(`/api/match/${carlosId}`)
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`);
    const row = db
      .prepare('SELECT score FROM afinidad WHERE usuario_a_id=? AND usuario_b_id=?')
      .get(Math.min(anaId, carlosId), Math.max(anaId, carlosId)) as any;
    expect(row.score).toBe(AFINIDAD_ANA_CARLOS);
  });
});

describe('GET /api/match?ids=', () => {
  it('resuelve varios usuarios en una sola llamada', async () => {
    const r = await request(app)
      .get(`/api/match?ids=${carlosId},${lauraId}`)
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`);
    expect(r.status).toBe(200);
    expect(r.body.afinidades[String(carlosId)].score).toBe(AFINIDAD_ANA_CARLOS);
    expect(r.body.afinidades[String(lauraId)].score).toBe(0);
  });

  it('ignora el propio id, los ids inexistentes y la basura', async () => {
    const r = await request(app)
      .get(`/api/match?ids=${anaId},999999,abc,`)
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`);
    expect(r.status).toBe(200);
    expect(r.body.afinidades).toEqual({});
  });
});

describe('GET /api/match/candidatos/lista', () => {
  it('incluye a usuarios con busca_afinidad "indiferente" (regresión del WHERE con precedencia AND/OR)', async () => {
    const r = await request(app)
      .get('/api/match/candidatos/lista')
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`);
    expect(r.status).toBe(200);
    const ids = r.body.candidatos.map((c: any) => c.usuario_id);
    expect(ids).toContain(carlosId);
    expect(ids).not.toContain(anaId);
    // Descendente por score y sin los que puntuan 0
    const scores = r.body.candidatos.map((c: any) => c.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
    expect(scores.every((s: number) => s > 0)).toBe(true);
  });

  it('exige autenticación', async () => {
    expect((await request(app).get('/api/match/candidatos/lista')).status).toBe(401);
  });
});

describe('GET /api/casas?orden=afinidad', () => {
  it('ordena por afinidad descendente e incluye el score', async () => {
    const r = await request(app)
      .get('/api/casas?orden=afinidad')
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`);
    expect(r.status).toBe(200);
    expect(r.body.casas.length).toBeGreaterThanOrEqual(2);
    // La casa de Carlos (afinidad 90) debe ir antes que la de Laura (0),
    // aunque la de Laura se creo despues.
    expect(r.body.casas[0].id).toBe(casaCarlos);
    expect(r.body.casas[0].afinidad).toBe(AFINIDAD_ANA_CARLOS);
    expect(r.body.casas[0].afinidad_detalle.complementario_calendario).toBe(true);
    const afinidades = r.body.casas.map((c: any) => c.afinidad);
    expect(afinidades).toEqual([...afinidades].sort((a: number, b: number) => b - a));
  });

  it('ignora orden=afinidad sin token y no expone el campo afinidad', async () => {
    const r = await request(app).get('/api/casas?orden=afinidad');
    expect(r.status).toBe(200);
    expect(r.body.casas.length).toBeGreaterThanOrEqual(2);
    for (const c of r.body.casas) expect(c.afinidad).toBeUndefined();
  });

  it('sin orden mantiene la paginacion por fecha (mas reciente primero)', async () => {
    const r = await request(app).get('/api/casas');
    expect(r.body.casas[0].id).toBe(casaLaura);
  });

  it('topa el limite de pagina para que no se cargue la tabla entera', async () => {
    const r = await request(app).get('/api/casas?limite=999999');
    expect(r.body.paginacion.limite).toBe(100);
  });

  it('no filtra por afinidad si el usuario no tiene perfil de afinidad', async () => {
    const sinPerfil = db
      .prepare("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,?)")
      .run('Sin perfil', 'sinperfil@test.local', 'x', 'buscador');
    const r = await request(app)
      .get('/api/casas?orden=afinidad')
      .set('Authorization', `Bearer ${token(Number(sinPerfil.lastInsertRowid), 'buscador')}`);
    expect(r.status).toBe(200);
    expect(r.body.casas.length).toBeGreaterThanOrEqual(2);
  });
});

describe('PUT/GET /api/auth/me (campos de afinidad)', () => {
  it('guarda custodia, hijos, tags y preferencia', async () => {
    const nuevo = crearUsuario({ nombre: 'Nuevo', email: 'nuevo@test.local', rol: 'buscador' });
    const r = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token(nuevo, 'buscador')}`)
      .send({
        custodia_patron: 'semana_alterna',
        custodia_semana_par: false,
        num_hijos: 3,
        estilo_vida_tags: ['tranquilo', 'con_hijos'],
        busca_afinidad: 'divorciados',
      });
    expect(r.status).toBe(200);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token(nuevo, 'buscador')}`);
    expect(me.status).toBe(200);
    expect(me.body.custodia_patron).toBe('semana_alterna');
    // false debe guardarse como 0, no como null: es la diferencia entre
    // "semanas pares" y "semanas impares" en el calculo de afinidad.
    expect(me.body.custodia_semana_par).toBe(0);
    expect(me.body.num_hijos).toBe(3);
    expect(me.body.estilo_vida_tags).toEqual(['tranquilo', 'con_hijos']);
    expect(me.body.busca_afinidad).toBe('divorciados');
  });

  it('acepta num_hijos: 0 y lista de tags vacia (poder borrar lo guardado)', async () => {
    const id = crearUsuario({ nombre: 'Borrar', email: 'borrar@test.local', rol: 'buscador' });
    const auth = `Bearer ${token(id, 'buscador')}`;
    await request(app)
      .put('/api/auth/me')
      .set('Authorization', auth)
      .send({ custodia_patron: 'semana_alterna', num_hijos: 2, estilo_vida_tags: ['tranquilo'] });

    const r = await request(app)
      .put('/api/auth/me')
      .set('Authorization', auth)
      .send({ num_hijos: 0, estilo_vida_tags: [] });
    expect(r.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', auth);
    expect(me.body.num_hijos).toBe(0);
    expect(me.body.estilo_vida_tags).toEqual([]);
  });

  it('rechaza valores fuera del dominio permitido', async () => {
    const r = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token(anaId, 'buscador')}`)
      .send({ custodia_patron: 'inventado' });
    expect(r.status).toBe(400);
  });

  it('borra custodia_patron con null explicito y la deja intacta si se omite', async () => {
    const id = crearUsuario({ nombre: 'Sin custodia', email: 'sincustodia@test.local', rol: 'buscador' });
    const auth = `Bearer ${token(id, 'buscador')}`;
    await request(app)
      .put('/api/auth/me')
      .set('Authorization', auth)
      .send({ custodia_patron: 'semana_alterna', num_hijos: 2 });

    // Ausente = "no lo toques": un PUT parcial de otro campo no debe borrar la custodia.
    await request(app).put('/api/auth/me').set('Authorization', auth).send({ num_hijos: 4 });
    let me = await request(app).get('/api/auth/me').set('Authorization', auth);
    expect(me.body.custodia_patron).toBe('semana_alterna');

    // null explicito = "Sin especificar" en el formulario. Con COALESCE esto devolvia
    // 200 sin borrar nada y la UI Volvia a pintar el valor anterior.
    const r = await request(app).put('/api/auth/me').set('Authorization', auth).send({ custodia_patron: null });
    expect(r.status).toBe(200);

    me = await request(app).get('/api/auth/me').set('Authorization', auth);
    expect(me.body.custodia_patron).toBeNull();
    // El resto del perfil no se toco al borrar un solo campo.
    expect(me.body.num_hijos).toBe(4);
  });

  it('el score deja de contar custodia complementaria cuando el usuario borra su patron', async () => {
    const id = crearUsuario({ nombre: 'Ana otra vez', email: 'ana2@test.local', rol: 'buscador' });
    const auth = `Bearer ${token(id, 'buscador')}`;
    // Mismo perfil que Ana: 45 custodia + 25 hijos + 20 estilo de vida.
    await request(app)
      .put('/api/auth/me')
      .set('Authorization', auth)
      .send({
        custodia_patron: 'semana_alterna',
        custodia_semana_par: true,
        num_hijos: 2,
        estilo_vida_tags: ['con_hijos', 'tranquilo', 'no_fumador'],
      });
    const antes = await request(app).get(`/api/match/${carlosId}`).set('Authorization', auth);
    expect(antes.body.score).toBe(AFINIDAD_ANA_CARLOS);

    await request(app).put('/api/auth/me').set('Authorization', auth).send({ custodia_patron: null });

    // Sin patron de custodia los 45 puntos de custodia desaparecen, pero siguen
    // contando los hijos y los tags: 0 + 25 + 20.
    const despues = await request(app).get(`/api/match/${carlosId}`).set('Authorization', auth);
    expect(despues.status).toBe(200);
    expect(despues.body.score).toBe(45);
    expect(despues.body.detalle.custodia).toBe(0);
    expect(despues.body.detalle.complementario_calendario).toBe(false);
  });

  it('devuelve 401 sin token', async () => {
    expect((await request(app).put('/api/auth/me').send({ num_hijos: 1 })).status).toBe(401);
  });
});

describe('GET /api/match/candidatos/lista (tope del conjunto puntuado)', () => {
  it('acota en SQL los candidatos que puntúa: con más candidatos que el tope, los más antiguos quedan fuera', async () => {
    // El score se calcula en JS, así que la consulta no puede ordenar por afinidad:
    // acota los candidatos a los más recientes (POOL_CANDIDATOS = 500). Con un buscador
    // y 520 candidatos perfectos, el de menor id (el más antiguo) cae fuera del conjunto
    // puntuado y no aparece; el más reciente sí. Antes esta consulta traía TODOS los
    // usuarios y recortaba al final, así que ningún candidato quedaba fuera.
    const buscador = crearUsuario({ nombre: 'Buscador pool', email: 'pool@test.local', rol: 'buscador' });
    guardarPerfil(buscador, {
      custodia_patron: 'semana_alterna',
      custodia_semana_par: 1,
      num_hijos: 2,
      estilo_vida_tags: JSON.stringify(['con_hijos', 'tranquilo', 'no_fumador']),
    });

    const N = 520;
    const ids: number[] = [];
    // Sentencias preparadas fuera de la transacción (recomendado por better-sqlite3).
    const insertarUsuario = db.prepare("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,?)");
    const insertarPerfil = db.prepare(
      "INSERT INTO perfiles (usuario_id,custodia_patron,custodia_semana_par,num_hijos,estilo_vida_tags) VALUES (?,?,?,?,?)"
    );
    const insertarCandidatos = db.transaction(() => {
      for (let i = 0; i < N; i++) {
        const u = insertarUsuario.run(`Candidato ${i}`, `candidato${i}@pool.local`, 'x', 'anfitrion');
        const id = Number(u.lastInsertRowid);
        // Semanas complementarias + hijos + 2 tags en común -> score 90 con el buscador.
        insertarPerfil.run(id, 'semana_alterna', 0, 1, JSON.stringify(['con_hijos', 'tranquilo']));
        ids.push(id);
      }
    });
    insertarCandidatos();

    const r = await request(app)
      .get('/api/match/candidatos/lista?limite=50')
      .set('Authorization', `Bearer ${token(buscador, 'buscador')}`);

    expect(r.status).toBe(200);
    expect(r.body.candidatos.length).toBe(50);

    const devueltos = new Set<number>(r.body.candidatos.map((c: any) => c.usuario_id));
    // El más reciente entra; el más antiguo de los 520 queda por debajo del tope.
    expect(devueltos.has(ids[N - 1])).toBe(true);
    expect(devueltos.has(ids[0])).toBe(false);

    const scores = r.body.candidatos.map((c: any) => c.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
    expect(scores.every((s: number) => s > 0)).toBe(true);
  });
});
