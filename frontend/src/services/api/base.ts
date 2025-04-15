import axios, { 
    AxiosInstance, 
    AxiosRequestConfig, 
    AxiosResponse, 
    AxiosError,
    InternalAxiosRequestConfig
} from 'axios';

export interface ApiError {
    status: number;
    message: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

interface ErrorData {
    message?: string;
    [key: string]: any;
}

export class ApiService {
    private static instance: ApiService;
    private axiosInstance: AxiosInstance;

    private constructor() {
        this.axiosInstance = axios.create({
            baseURL: '/api',
            timeout: 10000,
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
                if (token) {
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
            async (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Handle token refresh or logout
                    localStorage.removeItem('token');
                    window.location.href = '/auth/login';
                }
                
                // Extract message safely
                let errorMessage = 'Unknown error occurred';
                if (error.response?.data) {
                    const errorData = error.response.data as ErrorData;
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } else if (axios.isAxiosError(error) && error.message) {
                    errorMessage = error.message;
                } else if (error instanceof Error) {
                    errorMessage = error.message;
                }
                
                // Format the error in a consistent way
                const formattedError: ApiError = {
                    status: error.response?.status || 500,
                    message: errorMessage
                };
                
                return Promise.reject(formattedError);
            }
        );
    }

    private handleError<T>(error: unknown): ApiResponse<T> {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.message || error.message || 'Unknown error occurred';
            
            return {
                success: false,
                error: {
                    status,
                    message
                }
            };
        }
        
        return {
            success: false,
            error: {
                status: 500,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        };
    }

    public async get<T = any>(url: string): Promise<ApiResponse<T>> {
        try {
            const response = await this.axiosInstance.get(url);
            return { success: true, data: response.data as T };
        } catch (error) {
            return this.handleError<T>(error);
        }
    }

    public async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        try {
            const response = await this.axiosInstance.post(url, data);
            return { success: true, data: response.data as T };
        } catch (error) {
            return this.handleError<T>(error);
        }
    }

    public async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        try {
            const response = await this.axiosInstance.put(url, data);
            return { success: true, data: response.data as T };
        } catch (error) {
            return this.handleError<T>(error);
        }
    }

    public async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        try {
            const response = await this.axiosInstance.patch(url, data);
            return { success: true, data: response.data as T };
        } catch (error) {
            return this.handleError<T>(error);
        }
    }

    public async delete<T = any>(url: string): Promise<ApiResponse<T>> {
        try {
            const response = await this.axiosInstance.delete(url);
            return { success: true, data: response.data as T };
        } catch (error) {
            return this.handleError<T>(error);
        }
    }

    public setAuthToken(token: string): void {
        localStorage.setItem('token', token);
    }

    public clearAuthToken(): void {
        localStorage.removeItem('token');
    }

    public getAuthToken(): string | null {
        return localStorage.getItem('token');
    }
}

export const apiService = ApiService.getInstance(); 