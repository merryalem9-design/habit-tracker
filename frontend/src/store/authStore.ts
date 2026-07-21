import { create } from "zustand";
import { tokenStorage } from "../lib/storage";

interface User {
  id: string;
  email: string;
  displayAlias: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: tokenStorage.getUser(),
  isAuthenticated: !!tokenStorage.getAccessToken(),
  login: (user, accessToken, refreshToken) => {
    tokenStorage.setAuthData(accessToken, refreshToken, user);
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    tokenStorage.clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));