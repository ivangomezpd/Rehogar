// Tipos de datos para definir el perfil
type CustodySchedule = 'FULL_TIME' | 'WEEKENDS_ONLY' | 'SHARED_50_50' | 'NO_KIDS_AT_HOME';

interface UserProfile {
  id: string;
  role: 'HOST' | 'SEEKER';
  attributes: {
    smoker: boolean;
    petsAllowed: boolean;
    nightOwl: boolean; // ¿Es nocturno?
    cleanlinessLevel: number; // 1-10
  };
  childrenInfo: {
    hasChildren: boolean;
    count: number;
    ageRanges: string[]; // ['0-5', '6-12', '13-18']
    schedule: CustodySchedule;
  };
}

/**
 * Calcula un porcentaje de compatibilidad entre un anfitrión y un buscador.
 * Un Senior Dev sabe que la lógica de negocio compleja debe estar aislada y testeable.
 */
class CompatibilityService {
  
  public calculateMatchScore(host: UserProfile, seeker: UserProfile): number {
    let score = 100;

    // 1. Filtros Bloqueantes (Deal Breakers)
    // Si el host no quiere mascotas y el seeker tiene, score 0.
    if (!host.attributes.petsAllowed && seeker.attributes.petsAllowed) {
      return 0;
    }
    // Si uno fuma y el otro detesta el tabaco (asumimos lógica simple aquí)
    if (host.attributes.smoker !== seeker.attributes.smoker) {
      score -= 30; 
    }

    // 2. Sinergia de Niños (La clave del negocio)
    score += this.evaluateChildrenSynergy(host, seeker);

    // 3. Compatibilidad de Convivencia
    const cleanlinessDiff = Math.abs(host.attributes.cleanlinessLevel - seeker.attributes.cleanlinessLevel);
    score -= (cleanlinessDiff * 5); // Penaliza 5 puntos por cada nivel de diferencia

    // Normalizar resultado entre 0 y 100
    return Math.max(0, Math.min(score, 100));
  }

  private evaluateChildrenSynergy(host: UserProfile, seeker: UserProfile): number {
    let synergyPoints = 0;

    // Caso: Ambos tienen niños en rangos de edad similares (¡Playdates!)
    const hostAges = host.childrenInfo.ageRanges;
    const seekerAges = seeker.childrenInfo.ageRanges;
    
    const hasCommonAges = hostAges.some(age => seekerAges.includes(age));
    if (hasCommonAges) {
      synergyPoints += 15; // Gran plus
    }

    // Caso: Calendarios complementarios vs opuestos
    // A veces se busca coincidir (ayuda mutua) y a veces no (privacidad)
    // Esto dependería de la preferencia del usuario, pero asumamos que buscan apoyo:
    if (host.childrenInfo.schedule === seeker.childrenInfo.schedule) {
      synergyPoints += 10; // Coinciden para ayudarse
    }

    return synergyPoints;
  }
}

// Ejemplo de uso
const hostExample: UserProfile = {
  id: '1', role: 'HOST',
  attributes: { smoker: false, petsAllowed: true, nightOwl: false, cleanlinessLevel: 8 },
  childrenInfo: { hasChildren: true, count: 1, ageRanges: ['6-12'], schedule: 'SHARED_50_50' }
};

const seekerExample: UserProfile = {
  id: '2', role: 'SEEKER',
  attributes: { smoker: false, petsAllowed: true, nightOwl: false, cleanlinessLevel: 7 },
  childrenInfo: { hasChildren: true, count: 1, ageRanges: ['6-12'], schedule: 'SHARED_50_50' }
};

const service = new CompatibilityService();
console.log(`Match Score: ${service.calculateMatchScore(hostExample, seekerExample)}%`);
