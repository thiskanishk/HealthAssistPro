
import axios from '../hooks/useAxiosInterceptor';

export async function login(email, password) {
  const response = await axios.post('/auth/login', { email, password });
  const { accessToken, refreshToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  return response.data;
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}
