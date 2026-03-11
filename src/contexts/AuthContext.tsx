"use client";

/**
 * AuthContext — Manages authentication state across the application.
 *
 * Provides:
 * - `user`        — Current user profile or null
 * - `loading`     — True during initial session check
 * - `login()`     — Authenticate with email/password (+ optional 2FA)
 * - `register()`  — Create a new account
 * - `logout()`    — Destroy the current session
 * - `refreshUser()` — Re-fetch the current user profile
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

// ---- Types ----

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string;
  avatar: string | null;
  country: string | null;
  language: string;
  balanceHoney: number;
  lifetimeEarned: number;
  xp: number;
  level: number;
  vipTier: string;
  currentStreak: number;
  longestStreak: number;
  lastEarnDate: string | null;
  referralCode: string;
  referralTier: string;
  kycStatus: string | null;
  twoFactorEnabled: boolean;
  profilePublic: boolean;
  anonymousInChat: boolean;
  anonymousOnLeaderboard: boolean;
  balanceDisplay: string;
  chatOpenDefault: boolean;
  notifEmail: Record<string, boolean>;
  notifPush: Record<string, boolean>;
  notifOnsite: Record<string, boolean>;
  stats: {
    referrals: number;
    offersCompleted: number;
    achievements: number;
    surveyProfileCompletion: number;
  };
  createdAt: string;
  lastLoginAt: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    twoFactorCode?: string
  ) => Promise<{ requires2FA?: boolean }>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ---- XP Progress Helper ----

/**
 * Compute XP required to reach a given level.
 * Mirrors server-side `xpForLevel` in engagement.ts.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level, 1.5));
}

/**
 * Get level progress percentage for display.
 */
export function getLevelProgress(
  xp: number,
  level: number
): { xpInLevel: number; xpNeeded: number; percent: number } {
  const xpCurrent = xpForLevel(level);
  const xpNext = xpForLevel(level + 1);
  const xpInLevel = xp - xpCurrent;
  const xpNeeded = xpNext - xpCurrent;

  return {
    xpInLevel,
    xpNeeded,
    percent: xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 0,
  };
}

// ---- Context ----

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: AuthUser }>("/api/user/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string, twoFactorCode?: string) => {
      const data = await api.post<{
        user?: AuthUser;
        requires2FA?: boolean;
      }>("/api/auth/login", { email, password, twoFactorCode });

      if (data.requires2FA) {
        return { requires2FA: true };
      }

      // Session cookie is now set — fetch full profile
      await refreshUser();
      return {};
    },
    [refreshUser]
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      username: string;
      referralCode?: string;
    }) => {
      await api.post("/api/auth/register", data);
      // Session cookie is now set — fetch full profile
      await refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Even if API fails, clear client state
    }
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
