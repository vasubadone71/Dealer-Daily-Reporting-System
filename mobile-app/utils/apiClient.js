import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000, // 6 seconds timeout
});

// Request Interceptor: Inject JWT and Log request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('[API Request Interceptor] Token retrieval failed:', e);
    }
    
    // Debug logging
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data) {
      console.log('[API Request Body]', JSON.stringify(config.data));
    }
    return config;
  },
  (error) => {
    console.error('[API Request Interceptor Error]', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Parse response and Map user-friendly errors
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    if (response.data) {
      console.log('[API Response Body]', JSON.stringify(response.data).substring(0, 300));
    }
    return response;
  },
  async (error) => {
    console.log(`[API Response Error] ${error.config?.url || 'unknown url'}`, error.message);
    
    let friendlyMessage = 'An unexpected error occurred.';
    
    if (error.code === 'ECONNABORTED') {
      friendlyMessage = 'Server Timeout. The backend is taking too long to respond.';
    } else if (!error.response) {
      friendlyMessage = 'Server Offline. Cannot reach the API server. Please check your network connection or verify that the backend is running at ' + API_BASE_URL;
    } else {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401 || status === 403) {
        friendlyMessage = data?.message || 'Authentication Failed. Invalid credentials or expired session.';
      } else if (status >= 500) {
        friendlyMessage = 'Internal Server Error. The backend encountered a problem.';
      } else {
        friendlyMessage = data?.message || `Network error occurred (Status Code: ${status})`;
      }
    }

    // Attach mapped message directly to error
    error.userFriendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

export default apiClient;
