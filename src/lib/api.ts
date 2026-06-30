import axios, { AxiosError, type AxiosInstance } from 'axios';
import { storage } from './storage';

export interface ApiEnvelope<T> {
  data: T;
  message: string;
  statusCode: number;
}

export class ApiError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false, // desktop uses Authorization header, not cookies
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown> | undefined;
    if (body && typeof body === 'object' && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const env = error.response?.data;
    const message = env?.message || error.message || 'Network error';
    const statusCode = env?.statusCode || error.response?.status || 0;
    const details =
      env && typeof env.data === 'object' && env.data !== null
        ? (env.data as Record<string, unknown>)
        : undefined;
    return Promise.reject(new ApiError(message, statusCode, details));
  },
);

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<T> =>
    instance.get<T>(url, { params }).then((r) => r.data),
  post: <T>(url: string, body?: unknown): Promise<T> =>
    instance.post<T>(url, body).then((r) => r.data),
  patch: <T>(url: string, body?: unknown): Promise<T> =>
    instance.patch<T>(url, body).then((r) => r.data),
  delete: <T>(url: string): Promise<T> =>
    instance.delete<T>(url).then((r) => r.data),
  raw: instance,
};
