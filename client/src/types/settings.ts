export interface LandlordSettings {
    ratePerUnitPaise: number;
    meterCapacity: number;
    updatedAt: string | null;
}

export interface UpdateSettingsInput {
    ratePerUnitPaise?: number;
    meterCapacity?: number;
}
