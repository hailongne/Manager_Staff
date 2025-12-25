// API xác thực
import api from "./axios";

// Kiểu dữ liệu phản hồi đăng nhập
export interface AuthResponse {
  token: string;
  user: Record<string, unknown>;
}

// Đăng nhập
export async function login(identifier: string, password: string): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/login', { identifier, password });
    return response.data;
  } catch (error) {
    console.error('Login API error:', (error as { response?: { data?: unknown }; message?: string }).response?.data || (error as { message?: string }).message);
    throw error;
  }
}
