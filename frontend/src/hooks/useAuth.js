import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Hook lấy thông tin đăng nhập từ AuthContext
export default function useAuth() {
  return useContext(AuthContext);
}
