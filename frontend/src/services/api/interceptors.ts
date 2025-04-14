import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

export const setupInterceptors = (api: AxiosInstance) => {
    // Request interceptor
    api.interceptors.request.use(
        (config) => {
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
    api.interceptors.response.use(
        (response: AxiosResponse) => {
            return response;
        },
        async (error: AxiosError) => {
            const originalRequest = error.config;

            // Handle token refresh
            if (error.response?.status === 401 && originalRequest) {
                try {
                    const refreshToken = localStorage.getItem('refreshToken');
                    if (refreshToken) {
                        const response = await api.post('/auth/refresh-token', {
                            refreshToken
                        });

                        const { token } = response.data;
                        localStorage.setItem('token', token);

                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    // Clear tokens and redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/auth/login';
                }
            }

            return Promise.reject(error);
        }
    );
}; 