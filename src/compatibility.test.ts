import { CompatibilityService } from './compatibility';
import { UserProfile } from './types';

describe('CompatibilityService', () => {
    let service: CompatibilityService;

    const baseUser: UserProfile = {
        id: '1', role: 'HOST',
        authProvider: 'EMAIL',
        profileStatus: 'ACTIVE',
        subscription: { isActive: true },
        verification: { isVerified: true },
        financials: { monthlyBudget: 500 },
        attributes: {
            smoker: false,
            petsAllowed: true,
            nightOwl: false,
            cleanlinessLevel: 5,
            ageRanges: ['6-12'],
            schedule: 'SHARED_50_50'
        }
    };

    beforeEach(() => {
        service = new CompatibilityService();
    });

    test('Debe devolver 0 si el anfitrión no admite mascotas y el buscador tiene una', () => {
        const host = { ...baseUser, role: 'HOST' as const, attributes: { ...baseUser.attributes, petsAllowed: false } };
        const seeker = { ...baseUser, id: '2', role: 'SEEKER' as const, attributes: { ...baseUser.attributes, petsAllowed: true } };

        const score = service.calculateMatchScore(host, seeker);
        expect(score).toBe(0);
    });

    test('Debe penalizar si uno fuma y el otro no', () => {
        const host = { ...baseUser, attributes: { ...baseUser.attributes, smoker: false } };
        const seeker = { ...baseUser, id: '2', role: 'SEEKER' as const, attributes: { ...baseUser.attributes, smoker: true } };

        const score = service.calculateMatchScore(host, seeker);
        expect(score).toBe(70);
    });

    test('Debe bonificar si los hijos tienen edades similares (Sinergia)', () => {
        const host: UserProfile = {
            ...baseUser,
            attributes: { ...baseUser.attributes, ageRanges: ['6-12'], schedule: 'SHARED_50_50' as const }
        };
        const seeker: UserProfile = {
            ...baseUser,
            id: '2', role: 'SEEKER' as const,
            attributes: { ...baseUser.attributes, ageRanges: ['6-12'], schedule: 'SHARED_50_50' as const }
        };

        // 100 base + 15 sinergia edad + 10 sinergia calendario = 125 -> Normalizado a 100
        const score = service.calculateMatchScore(host, seeker);
        expect(score).toBe(100);
    });

    test('Debe penalizar diferencias drásticas de limpieza', () => {
        const host = { ...baseUser, attributes: { ...baseUser.attributes, cleanlinessLevel: 10 } };
        const seeker = { ...baseUser, id: '2', role: 'SEEKER' as const, attributes: { ...baseUser.attributes, cleanlinessLevel: 1 } };

        const score = service.calculateMatchScore(host, seeker);
        expect(score).toBe(80);
    });
});
