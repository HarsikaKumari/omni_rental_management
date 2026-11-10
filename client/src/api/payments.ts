import { api } from './client';
import type { AddPaymentInput } from '../types/bill';

export const paymentsApi = {
    add: async (input: AddPaymentInput): Promise<void> => {
        await api.post('/payments', input);
    },
};
