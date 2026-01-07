import axios from 'axios';

// Sử dụng proxy Vite trong development, URL đầy đủ trong production
const isDevelopment = import.meta.env.DEV;
const baseURL = isDevelopment ? '/api' : import.meta.env.VITE_API_URL;

// Tạo instance axios
const instance = axios.create({
  baseURL,
});

const SESSION_LOGOUT_REASON_KEY = 'session_logout_reason';
const SESSION_EXPIRED_MESSAGE = 'Hết phiên đăng nhập. Vui lòng đăng nhập lại.';

// Xóa dữ liệu session
const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('token_expires_at');
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'token_expires_at=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

let isHandlingUnauthorized = false;

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      clearSession();
      if (window.location.pathname !== '/login') {
          sessionStorage.setItem(SESSION_LOGOUT_REASON_KEY, 'expired_alerted');
        window.alert(SESSION_EXPIRED_MESSAGE);
        window.location.href = '/login?session=expired';
      } else {
        sessionStorage.removeItem(SESSION_LOGOUT_REASON_KEY);
        isHandlingUnauthorized = false;
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
