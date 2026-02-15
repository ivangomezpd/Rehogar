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
        if (host.attributes.ageRanges.length > 0 && seeker.attributes.ageRanges.length > 0) {
            const commonAges = host.attributes.ageRanges.filter(age => seeker.attributes.ageRanges.includes(age));
            if (commonAges.length > 0) {
                score += 15; // Sinergia alta si tienen niños de edades similares
            } else {
                score += 5;
            }
        }

        // 3. Calendario de Custodia
        if (host.attributes.schedule === seeker.attributes.schedule) {
            score += 10; // Bonus por calendarios compatibles
        }

        // 4. Nivel de limpieza
        const cleanlinessDiff = Math.abs(host.attributes.cleanlinessLevel - seeker.attributes.cleanlinessLevel);
        score -= (cleanlinessDiff * 5);

        return Math.max(0, Math.min(100, score));
    }
}
