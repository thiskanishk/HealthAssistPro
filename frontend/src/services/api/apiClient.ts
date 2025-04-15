import axios from 'axios';

// Create an axios instance with default config
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle session expiration
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API client with typed methods
export const apiClient = {
  get: <T>(url: string, params?: any): Promise<T> => 
    axiosInstance.get(url, { params }),
  
  post: <T>(url: string, data?: any): Promise<T> => 
    axiosInstance.post(url, data),
  
  put: <T>(url: string, data?: any): Promise<T> => 
    axiosInstance.put(url, data),
  
  patch: <T>(url: string, data?: any): Promise<T> => 
    axiosInstance.patch(url, data),
  
  delete: <T>(url: string): Promise<T> => 
    axiosInstance.delete(url)
}; 