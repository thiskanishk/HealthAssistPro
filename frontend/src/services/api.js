const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

const api = {
  // ... your API methods
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
};

export default api; 