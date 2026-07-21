// Storage adapter interface — abstracts WHERE tokens and user data are stored.

interface StoredUser {
  id: string;
  email: string;
  displayAlias: string;
}

interface TokenStorage {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  getUser: () => StoredUser | null;
  setAuthData: (accessToken: string, refreshToken: string, user: StoredUser | null) => void;
  clearTokens: () => void;
}

const ACCESS_KEY = "habit_tracker_access_token";
const REFRESH_KEY = "habit_tracker_refresh_token";
const USER_KEY = "habit_tracker_user";

export const tokenStorage: TokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },
  setAuthData: (accessToken, refreshToken, user) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};