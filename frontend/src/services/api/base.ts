import axios, { 
    AxiosInstance, 
    AxiosRequestConfig, 
    AxiosResponse, 
    AxiosError,
    InternalAxiosRequestConfig
} from 'axios';

export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export class ApiService {
    private static instance: ApiService;
    private axiosInstance: AxiosInstance;

    private constructor() {
        this.axiosInstance = axios.create({
            baseURL: process.env.REACT_APP_API_URL || '',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.setupInterceptors();
    }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    private setupInterceptors(): void {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const token = localStorage.getItem('token');
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error: AxiosError) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Handle token expiration
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
                return Promise.reject(this.handleError(error));
            }
        );
    }

    private handleError(error: AxiosError): Error {
        if (error.response?.data && typeof error.response.data === 'object' && 'error' in error.response.data) {
            const apiError = error.response.data as { error: ApiError };
            return new Error(apiError.error.message);
        }
        return error;
    }

    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
        return response.data;
    }

    public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
        return response.data;
    }

    public setAuthToken(token: string): void {
        localStorage.setItem('token', token);
        this.axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
    }

    public clearAuthToken(): void {
        localStorage.removeItem('token');
        delete this.axiosInstance.defaults.headers.common.Authorization;
    }
} 