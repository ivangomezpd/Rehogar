import { Request, Response, Router } from 'express';
import { UserProfile, PropertyDetails } from './types';
import { CompatibilityService } from './compatibility';

const router = Router();
const compatibilityService = new CompatibilityService();

// Mock Data
const hostExample: UserProfile = {
    id: '1', role: 'HOST',
    authProvider: 'EMAIL',
    profileStatus: 'ACTIVE',
    subscription: { isActive: true },
    verification: { isVerified: true },
    financials: { monthlyBudget: 500 },
    attributes: { smoker: false, petsAllowed: true, nightOwl: false, cleanlinessLevel: 8 },
    childrenInfo: { hasChildren: true, count: 1, ageRanges: ['6-12'], schedule: 'SHARED_50_50' }
};

const seekerExample: UserProfile = {
    id: '2', role: 'SEEKER',
    authProvider: 'GOOGLE',
    profileStatus: 'ACTIVE',
    subscription: { isActive: true },
    verification: { isVerified: true },
    financials: { monthlyBudget: 600 },
    attributes: { smoker: false, petsAllowed: true, nightOwl: false, cleanlinessLevel: 7 },
    childrenInfo: { hasChildren: true, count: 1, ageRanges: ['6-12'], schedule: 'SHARED_50_50' }
};

// Routes

router.post('/auth/register', async (req: Request, res: Response) => {
    res.status(201).json({ token: 'jwt_token_example', userId: 'uuid' });
});

router.get('/matches', async (req: Request, res: Response) => {
    const score = compatibilityService.calculateMatchScore(hostExample, seekerExample);
    const matches = [
        {
            userId: seekerExample.id,
            matchScore: score,
            summary: 'Buscador compatible con presupuesto y valores',
            location: { lat: 40.4167, lng: -3.7032, address: 'Madrid Centro' },
            childrenInfo: seekerExample.childrenInfo
        }
    ];
    res.status(200).json({ data: matches, page: 1 });
});

router.post('/matches/:targetUserId/unlock-contact', async (req: Request, res: Response) => {
    const hasActiveSubscription = true;

    if (!hasActiveSubscription) {
        return res.status(403).json({
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'Necesitas una suscripción activa para ver el teléfono.'
        });
    }

    const contactInfo = { phoneNumber: '+34666555444', whatsappLink: 'https://wa.me/34666555444' };
    res.status(200).json(contactInfo);
});

export default router;
