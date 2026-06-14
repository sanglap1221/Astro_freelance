"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

// ── Types ──

interface UserInfo {
  username: string;
  role: string;
  created_at?: string;
}

interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  sessionExpired: false,
});

export const useAuth = () => useContext(AuthContext);

// ── Helpers ──

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "astro_jwt_token";
const USER_KEY = "astro_user_info";
const REMEMBER_KEY = "astro_remember_me";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): UserInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

function storeAuth(token: string, user: UserInfo, remember: boolean) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp;
    if (!exp) return true;
    return Date.now() / 1000 > exp;
  } catch {
    return true;
  }
}

// ── Provider Component ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Check stored auth on mount
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      if (isTokenExpired(storedToken)) {
        // Token expired — clear and redirect to login
        clearAuth();
        setSessionExpired(true);
        setIsLoading(false);
        if (pathname !== "/login") {
          router.replace("/login");
        }
      } else {
        // Valid token — restore session
        setToken(storedToken);
        setUser(storedUser);
        setIsLoading(false);
      }
    } else {
      // No stored auth — redirect to login if not already there
      setIsLoading(false);
      if (pathname !== "/login") {
        router.replace("/login");
      }
    }
  }, []);

  // Login function
  const login = useCallback(
    async (username: string, password: string) => {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(data?.detail || "Login failed");
      }

      const data = await response.json();
      const userInfo: UserInfo = {
        username: data.user.username,
        role: data.user.role,
        created_at: data.user.created_at,
      };

      setToken(data.access_token);
      setUser(userInfo);
      setSessionExpired(false);
      storeAuth(data.access_token, userInfo, true); // always remember in Electron

      router.replace("/");
    },
    [router]
  );

  // Logout function
  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
    setSessionExpired(false);
    router.replace("/login");
  }, [router]);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        logout,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
