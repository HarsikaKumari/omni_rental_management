import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
    withCredentials: true, // required: sends the httpOnly auth cookie
    headers: { 'Content-Type': 'application/json' },
});

/** Turn any axios/unknown error into a readable string for the UI. */
export function getApiErrorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: { message?: string } } | undefined;
        return data?.error?.message ?? err.message ?? 'Something went wrong';
    }
    return err instanceof Error ? err.message : 'Something went wrong';
}
