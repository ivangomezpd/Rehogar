import { calcularAfinidad, parseTags, PerfilAfinidad } from '../utils/afinidad';

function perfil(overrides: Partial<PerfilAfinidad> = {}): PerfilAfinidad {
  return {
    custodia_patron: null,
    custodia_semana_par: null,
    num_hijos: 0,
    estilo_vida_tags: [],
    busca_afinidad: 'indiferente',
    ...overrides,
  };
}

describe('parseTags', () => {
  it('parsea un JSON válido de tags', () => {
    expect(parseTags('["con_hijos","tranquilo"]')).toEqual(['con_hijos', 'tranquilo']);
  });
  it('devuelve array vacío si es null o inválido', () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags('no es json')).toEqual([]);
  });
});

describe('calcularAfinidad', () => {
  it('da el score máximo de custodia cuando las semanas son complementarias', () => {
    const a = perfil({ custodia_patron: 'semana_alterna', custodia_semana_par: 1, num_hijos: 1 });
    const b = perfil({ custodia_patron: 'semana_alterna', custodia_semana_par: 0, num_hijos: 2 });
    const r = calcularAfinidad(a, b);
    expect(r.detalle.complementario_calendario).toBe(true);
    expect(r.detalle.custodia).toBe(45);
    expect(r.detalle.hijos).toBe(25);
  });

  it('da menos score de custodia cuando las semanas coinciden (no complementarias)', () => {
    const a = perfil({ custodia_patron: 'semana_alterna', custodia_semana_par: 1, num_hijos: 1 });
    const b = perfil({ custodia_patron: 'semana_alterna', custodia_semana_par: 1, num_hijos: 1 });
    const r = calcularAfinidad(a, b);
    expect(r.detalle.complementario_calendario).toBe(false);
    expect(r.detalle.custodia).toBe(25);
  });

  it('puntúa el solape de tags de estilo de vida proporcionalmente', () => {
    const a = perfil({ estilo_vida_tags: ['tranquilo', 'con_hijos', 'no_fumador'] });
    const b = perfil({ estilo_vida_tags: ['tranquilo', 'con_hijos'] });
    const r = calcularAfinidad(a, b);
    // 2 tags en común de una base de 3 -> round(2/3 * 30) = 20
    expect(r.detalle.estilo_vida).toBe(20);
  });

  it('el score total nunca supera 100', () => {
    const a = perfil({ custodia_patron: 'semana_alterna', custodia_semana_par: 1, num_hijos: 3, estilo_vida_tags: ['a', 'b'] });
    const b = perfil({ custodia_patron: 'semana_alterna', custodia_semana_par: 0, num_hijos: 3, estilo_vida_tags: ['a', 'b'] });
    const r = calcularAfinidad(a, b);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('da score 0 cuando no hay ningún punto en común', () => {
    const a = perfil();
    const b = perfil();
    const r = calcularAfinidad(a, b);
    expect(r.score).toBe(0);
  });
});
