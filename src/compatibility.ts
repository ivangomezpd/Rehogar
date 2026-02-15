import { UserProfile } from './types';

export class CompatibilityService {

    public calculateMatchScore(host: UserProfile, seeker: UserProfile): number {
        let score = 100;

        // 0. Filtro Financiero (Deal Breaker Absoluto)
        if (host.role === 'HOST' && seeker.role === 'SEEKER') {
            if (seeker.financials.monthlyBudget < host.financials.monthlyBudget) {
                return 0;
            }
        }

        // 1. Filtros Bloqueantes (Deal Breakers)
        if (!host.attributes.petsAllowed && seeker.attributes.petsAllowed) {
            return 0;
        }

        if (host.attributes.smoker !== seeker.attributes.smoker) {
            score -= 30; // Diferencia de hábitos
        }

        // 2. Sinergia de Niños (El "Gancho")
        if (host.childrenInfo.hasChildren && seeker.childrenInfo.hasChildren) {
            // Si ambos tienen niños, el score sube o se mantiene alto
            score += 10;
        }

        // 3. Nivel de limpieza
        const cleanlinessDiff = Math.abs(host.attributes.cleanlinessLevel - seeker.attributes.cleanlinessLevel);
        score -= (cleanlinessDiff * 5);

        return Math.max(0, Math.min(100, score));
    }
}
