import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext';

// Hook sử dụng thông tin xác thực
export const useAuth = () => useContext(AuthContext);
