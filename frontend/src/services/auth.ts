import axios from 'axios';
import { User } from '../types/user';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface LoginResponse {
  user: User;
  message: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await axios.post(
      `${API_URL}/auth/login`,
      { email, password },
      { withCredentials: true } // Important for cookies
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await axios.post(
      `${API_URL}/auth/logout`,
      {},
      { withCredentials: true }
    );
  },

  async refreshToken(): Promise<void> {
    await axios.post(
      `${API_URL}/auth/refresh-token`,
      {},
      { withCredentials: true }
    );
  },

  async getCurrentUser(): Promise<User> {
    const response = await axios.get(
      `${API_URL}/auth/me`,
      { withCredentials: true }
    );
    return response.data;
  }
}; 