export type CustodySchedule = 'FULL_TIME' | 'WEEKENDS_ONLY' | 'SHARED_50_50' | 'NO_KIDS_AT_HOME';

export interface PropertyDetails {
    type: 'FLAT' | 'CHALET' | 'DUPLEX' | 'PENTHOUSE' | 'COUNTRY_HOUSE';
    sizeM2: number;
    totalRooms: number;
    floor?: number;
    hasElevator: boolean;
    hasTerrace: boolean;
    hasGarden: boolean;
    hasPool: boolean;
    isFurnished: boolean;
    description: string;
    photos: string[];
    address?: string; // Kept for compatibility
}

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
        ageRanges: string[]; // Moved from childrenInfo as per latest snippet
        schedule: CustodySchedule; // Moved from childrenInfo as per latest snippet
    };
    childrenInfo?: { // Keeping this as optional for backward compatibility if needed, but moving primary data to attributes
        hasChildren: boolean;
        count: number;
    };
    familyPhotoUrl?: string;
    avatarUrl?: string;
    propertyDetails?: PropertyDetails;
}
