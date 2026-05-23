import axios from 'axios';

const axiosClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // ✅ Gửi HttpOnly cookies tự động trong mọi request
});

// ── Response Interceptor: handle 401 + auto refresh ──────────────────────────
axiosClient.interceptors.response.use(
  (response) => response.data, // unwrap .data automatically
  async (error) => {
    const originalRequest = error.config;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const refreshUrl = `${baseUrl}/api/auth/refresh`;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      originalRequest?.url !== '/auth/refresh' &&
      originalRequest?.url !== refreshUrl
    ) {
      originalRequest._retry = true;
      try {
        // Refresh token nằm trong HttpOnly cookie — chỉ cần gọi endpoint
        // Server sẽ tự đọc cookie refreshToken và trả về cookie mới
        await axios.post(
          refreshUrl,
          {}, // body rỗng, server đọc từ cookie
          { withCredentials: true }
        );

        // Thử lại request gốc (cookie mới đã được set bởi server)
        return axiosClient(originalRequest);
      } catch {
        // Refresh failed: let caller handle unauthorized state
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

