import { api } from './client';
import type { AuthUser, ChangePasswordInput, LoginInput } from '../types/auth';

export const authApi = {
    login: async (input: LoginInput): Promise<AuthUser> => {
        const { data } = await api.post<{ user: AuthUser }>('/auth/login', input);
        return data.user;
    },
    logout: async (): Promise<void> => {
        await api.post('/auth/logout');
    },
    me: async (): Promise<AuthUser> => {
        const { data } = await api.get<{ user: AuthUser }>('/auth/me');
        return data.user;
    },
    changePassword: async (input: ChangePasswordInput): Promise<void> => {
        await api.patch('/auth/password', input);
    },
};
