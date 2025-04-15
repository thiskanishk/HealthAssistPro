// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Function to get authentication headers with token
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  
  return token ? {
    ...DEFAULT_HEADERS,
    'Authorization': `Bearer ${token}`
  } : DEFAULT_HEADERS;
};

// Error messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  BAD_REQUEST: 'Invalid request. Please check your data and try again.',
  TIMEOUT: 'Request timed out. Please try again.'
}; 