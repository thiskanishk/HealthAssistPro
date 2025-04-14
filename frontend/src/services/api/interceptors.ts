import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

export const setupInterceptors = (api: AxiosInstance) => {
    // Request interceptor
    api.interceptors.request.use(
        (config) => {
            // No need to set Authorization header as we're using cookies
            config.withCredentials = true; // Important for cookies
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

            // Handle 401 errors
            if (error.response?.status === 401 && originalRequest) {
                try {
                    // The refresh will be handled by the cookie auth middleware
                    await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
                    return api(originalRequest);
                } catch (refreshError) {
                    // Redirect to login on refresh failure
                    window.location.href = '/auth/login';
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
}; 