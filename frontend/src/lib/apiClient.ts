import axios from "axios";
import { tokenStorage } from "./storage";
import toast from "react-hot-toast"; // Import global toast

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

    // --- Handle Network Errors / Timeouts (Don't crash!) ---
    if (error.code === 'ERR_NETWORK' || error.message === 'timeout' || !error.response) {
      // If it's a backend sleep timeout (Render) and they are trying to login/signup, just pass the error.
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/signup')) {
        return Promise.reject(error);
      }
      // Otherwise, prompt them to refresh without logging them out immediately.
      toast.error("Server is waking up. Please try again in a moment.", { duration: 5000 });
      return Promise.reject(error);
    }

    // --- Handle Unauthorized (Expired Token) ---
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for login/signup
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/signup')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push(() => resolve(apiClient(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
          return Promise.reject(error);
        }

        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          refreshToken,
        });

        const currentUser = tokenStorage.getUser();
        tokenStorage.setAuthData(data.accessToken, data.refreshToken, currentUser);

        refreshQueue.forEach((cb) => cb());
        refreshQueue = [];

        return apiClient(originalRequest);
      } catch (refreshError) {
        // -- CLEAN LOGOUT FLOW --
        tokenStorage.clearTokens();
        
        // Show the toast message, wait 1.5s so the user reads it, then redirect
        toast.error("You have been logged out. Please log in again.", { duration: 4000 });
        
        setTimeout(() => {
          // This will now work perfectly without a 404 because of the new vercel.json rewrite!
          window.location.href = "/login";
        }, 1500);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;