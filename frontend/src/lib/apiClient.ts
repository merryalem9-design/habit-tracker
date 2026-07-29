import axios from "axios";
import { tokenStorage } from "./storage";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

// Attach the access token to every outgoing request automatically
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If a request fails with 401 (expired access token), try refreshing
// once, then retry the original request. If refresh also fails, log out.
let isRefreshing = false;
let refreshQueue: (() => void)[] = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // --- CRITICAL FIX START ---
      // If the request is for login or signup, do NOT attempt to refresh the token.
      // Just pass the error back to the AuthPage so it can show the toast message.
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/signup')) {
        return Promise.reject(error);
      }
      // --- CRITICAL FIX END ---

      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until the in-flight refresh finishes
        return new Promise((resolve) => {
          refreshQueue.push(() => resolve(apiClient(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
          // If no refresh token is available, reject the original error so AuthPage can show the message
          return Promise.reject(error);
        }

        const { data } = await axios.post("http://localhost:4000/api/auth/refresh", {
          refreshToken,
        });

        const currentUser = tokenStorage.getUser();
        tokenStorage.setAuthData(data.accessToken, data.refreshToken, currentUser);

        refreshQueue.forEach((cb) => cb());
        refreshQueue = [];

        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenStorage.clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;