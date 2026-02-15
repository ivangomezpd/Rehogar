export type CustodySchedule = 'FULL_TIME' | 'WEEKENDS_ONLY' | 'SHARED_50_50' | 'NO_KIDS_AT_HOME';

export interface UserProfile {
    id: string;
    role: 'HOST' | 'SEEKER';
    authProvider: 'EMAIL' | 'GOOGLE' | 'APPLE';
    profileStatus: 'ACTIVE' | 'PAUSED' | 'BANNED';
    subscription: {
        isActive: boolean;
    };
    verification: {
        dniUrl?: string;
        divorceDecreeUrl?: string;
        isVerified: boolean;
    };
    financials: {
        monthlyBudget: number;
    };
    attributes: {
        smoker: boolean;
        petsAllowed: boolean;
        nightOwl: boolean;
        cleanlinessLevel: number;
    };
    childrenInfo: {
        hasChildren: boolean;
        count: number;
        ageRanges: string[];
        schedule: CustodySchedule;
    };
}

export interface PropertyDetails {
    address: string;
    rooms: number;
    features: string[];
}
