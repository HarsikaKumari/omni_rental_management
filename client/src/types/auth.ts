export type Role = 'ADMIN' | 'LANDLORD';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}