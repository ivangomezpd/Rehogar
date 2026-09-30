export interface PerfilAfinidad {
  custodia_patron: string | null;
  custodia_semana_par: number | null;
  num_hijos: number;
  estilo_vida_tags: string[];
  busca_afinidad: string | null;
}

export interface ResultadoAfinidad {
  score: number;
  detalle: {
    custodia: number;
    hijos: number;
    estilo_vida: number;
    complementario_calendario: boolean;
  };
}

/**
 * Convierte el valor tal como viene de SQLite (JSON en TEXT, o null) a un array de tags.
 */
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Calcula la afinidad entre dos perfiles.
 *
 * Pesos: 45% custodia (complementaria en calendario = ideal para compartir sin pisarse
 * las semanas), 25% ambos con hijos (situación vital similar), 30% solape de tags de
 * estilo de vida. Es deliberadamente simple y explicable: cada componente se puede
 * mostrar al usuario para que entienda por qué le sale ese porcentaje.
 */
export function calcularAfinidad(a: PerfilAfinidad, b: PerfilAfinidad): ResultadoAfinidad {
  let custodia = 0;
  let complementario = false;

  if (a.custodia_patron === "semana_alterna" && b.custodia_patron === "semana_alterna") {
    if (a.custodia_semana_par != null && b.custodia_semana_par != null) {
      complementario = a.custodia_semana_par !== b.custodia_semana_par;
      custodia = complementario ? 45 : 25;
    } else {
      custodia = 20;
    }
  } else if (a.custodia_patron && b.custodia_patron && a.custodia_patron !== "ninguna" && b.custodia_patron !== "ninguna") {
    custodia = 15;
  }

  const hijos = a.num_hijos > 0 && b.num_hijos > 0 ? 25 : 0;

  const tagsA = a.estilo_vida_tags || [];
  const tagsB = b.estilo_vida_tags || [];
  const comunes = tagsA.filter((t) => tagsB.includes(t));
  const base = Math.max(tagsA.length, tagsB.length, 1);
  const estilo_vida = Math.round((comunes.length / base) * 30);

  const score = Math.min(custodia + hijos + estilo_vida, 100);

  return {
    score,
    detalle: { custodia, hijos, estilo_vida, complementario_calendario: complementario },
  };
}
