"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, bindAuthSession } from "@/lib/api/client";
import { fetchMe, loginUser, logoutUser, refreshAuthToken, registerUser } from "@/lib/api/yuvmi";
import { clearStoredSession, loadStoredSession, persistSession } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithEmail: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    mode: "login" | "register";
  }) => Promise<{ ok: boolean; message?: string; needsVerification?: boolean }>;
  refreshProfile: () => Promise<void>;
  markOnboardingComplete: () => void;
  signOut: () => void;
  updateTokens: (token: string, refreshToken: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(
  login: { token?: string; refresh_token?: string },
  profile: Awaited<ReturnType<typeof fetchMe>>,
  displayName: string,
): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName || displayName,
    provider: "email",
    token: login.token ?? "",
    refreshToken: login.refresh_token,
    onboardingComplete: profile.onboardingComplete,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateTokens = useCallback((token: string, refreshToken: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, token, refreshToken };
      persistSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    bindAuthSession({
      getRefreshToken: () => loadStoredSession()?.refreshToken,
      onTokenRefreshed: ({ token, refreshToken }) => updateTokens(token, refreshToken),
    });
    return () => bindAuthSession(null);
  }, [updateTokens]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const session = loadStoredSession();
      try {
        const profile = await fetchMe(session?.token ?? "");
        if (!mounted) return;
        const next = {
          id: profile.id,
          email: profile.email,
          displayName: profile.displayName || session?.displayName || "",
          provider: "email" as const,
          token: session?.token ?? "",
          refreshToken: session?.refreshToken,
          onboardingComplete: profile.onboardingComplete,
        };
        persistSession(next);
        setUser(next);
      } catch {
        try {
          const refreshed = await refreshAuthToken(session?.refreshToken ?? "");
          const profile = await fetchMe(refreshed.token ?? "");
          const next = toAuthUser(refreshed, profile, session?.displayName || "");
          persistSession(next);
          if (mounted) setUser(next);
          return;
        } catch {
          clearStoredSession();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const completeSignIn = useCallback((nextUser: AuthUser) => {
    persistSession(nextUser);
    setUser(nextUser);
  }, []);

  const signInWithEmail = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      mode: "login" | "register";
    }) => {
      try {
        if (input.mode === "register") {
          try {
            await registerUser({
              email: input.email,
              password: input.password,
              firstName: input.firstName ?? "Yuvmi",
              lastName: input.lastName ?? "Kullanıcı",
            });
          } catch (error) {
            if (!(error instanceof ApiError && error.code === 409)) {
              throw error;
            }
          }
        }
        try {
          const login = await loginUser(input.email, input.password);
          const profile = await fetchMe(login.token ?? "");
          completeSignIn(
            toAuthUser(
              login,
              profile,
              `${input.firstName ?? "Yuvmi"} ${input.lastName ?? ""}`.trim(),
            ),
          );
          return { ok: true };
        } catch (error) {
          if (error instanceof ApiError && error.code === 403 && /email not verified/i.test(error.message)) {
            return {
              ok: true,
              needsVerification: true,
              message: "Kayıt alındı. E-postandaki bağlantı ile hesabını doğrula, sonra giriş yap.",
            };
          }
          throw error;
        }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Giriş başarısız.";
        return { ok: false, message };
      }
    },
    [completeSignIn],
  );

  const refreshProfile = useCallback(async () => {
    if (!user?.token) return;
    const profile = await fetchMe(user.token);
    const next = {
      ...user,
      onboardingComplete: profile.onboardingComplete,
      displayName: profile.displayName || user.displayName,
    };
    persistSession(next);
    setUser(next);
  }, [user]);

  const markOnboardingComplete = useCallback(() => {
    if (!user) return;
    const next = { ...user, onboardingComplete: true };
    persistSession(next);
    setUser(next);
  }, [user]);

  const signOut = useCallback(() => {
    void logoutUser().catch(() => undefined);
    clearStoredSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signInWithEmail,
      refreshProfile,
      markOnboardingComplete,
      signOut,
      updateTokens,
    }),
    [
      user,
      isLoading,
      signInWithEmail,
      refreshProfile,
      markOnboardingComplete,
      signOut,
      updateTokens,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth yalnızca AuthProvider içinde kullanılabilir.");
  return context;
}
