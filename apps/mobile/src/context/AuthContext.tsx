import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api/client";
import { fetchMe, loginUser, registerUser } from "@/lib/api/yuvmi";
import { createDevAppleUser, signInWithAppleNative } from "@/lib/auth/apple";
import {
  createDevGoogleUser,
  promptGoogleSignIn,
  useGoogleAuthRequest,
} from "@/lib/auth/google";
import {
  clearStoredSession,
  isGoogleConfigured,
  loadStoredSession,
  persistSession,
} from "@/lib/auth/session";
import { AUTH_STORAGE_KEY, DEV_OAUTH_PASSWORD, type AuthProvider, type AuthUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isGoogleConfigured: boolean;
  signInWithEmail: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    mode: "login" | "register";
  }) => Promise<{ ok: boolean; message?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; message?: string }>;
  signInWithApple: () => Promise<{ ok: boolean; message?: string }>;
  refreshProfile: () => Promise<void>;
  markOnboardingComplete: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function backendSignIn(input: {
  email: string;
  password: string;
  provider: AuthProvider;
  displayName: string;
}): Promise<AuthUser> {
  let login;
  try {
    login = await loginUser(input.email, input.password);
  } catch (error) {
    if (error instanceof ApiError && error.code === 401) {
      await registerUser({
        email: input.email,
        password: input.password,
        firstName: input.displayName.split(" ")[0] ?? "Yuvmi",
        lastName: input.displayName.split(" ").slice(1).join(" ") || "Kullanıcı",
      });
      login = await loginUser(input.email, input.password);
    } else {
      throw error;
    }
  }

  const profile = await fetchMe(login.token);
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName || input.displayName,
    provider: input.provider,
    token: login.token,
    onboardingComplete: profile.onboardingComplete,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { request, promptAsync } = useGoogleAuthRequest();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const session = await loadStoredSession();
      if (!mounted) return;
      if (!session?.token) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await fetchMe(session.token);
        setUser({
          ...session,
          id: profile.id,
          email: profile.email,
          displayName: profile.displayName || session.displayName,
          onboardingComplete: profile.onboardingComplete,
        });
      } catch {
        await clearStoredSession();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const completeSignIn = useCallback(async (nextUser: AuthUser) => {
    await persistSession(nextUser);
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
          await registerUser({
            email: input.email,
            password: input.password,
            firstName: input.firstName ?? "Yuvmi",
            lastName: input.lastName ?? "Kullanıcı",
          });
        }
        const login = await loginUser(input.email, input.password);
        const profile = await fetchMe(login.token);
        await completeSignIn({
          id: profile.id,
          email: profile.email,
          displayName: profile.displayName || `${input.firstName ?? "Yuvmi"} ${input.lastName ?? ""}`.trim(),
          provider: "email",
          token: login.token,
          onboardingComplete: profile.onboardingComplete,
        });
        return { ok: true };
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Giriş başarısız.";
        return { ok: false, message };
      }
    },
    [completeSignIn],
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      if (!isGoogleConfigured()) {
        const devUser = createDevGoogleUser();
        const authed = await backendSignIn({
          email: devUser.email,
          password: DEV_OAUTH_PASSWORD,
          provider: "google",
          displayName: devUser.displayName,
        });
        await completeSignIn(authed);
        return { ok: true, message: "Google yapılandırması yok — backend dev oturumu açıldı." };
      }

      const result = await promptGoogleSignIn(promptAsync, request);
      if (!result.ok) {
        if (result.reason === "cancelled") return { ok: false, message: "Google girişi iptal edildi." };
        return { ok: false, message: result.message ?? "Google ile giriş başarısız." };
      }

      const authed = await backendSignIn({
        email: result.user.email,
        password: DEV_OAUTH_PASSWORD,
        provider: "google",
        displayName: result.user.displayName,
      });
      await completeSignIn(authed);
      return { ok: true };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Google girişi başarısız.";
      return { ok: false, message };
    }
  }, [completeSignIn, promptAsync, request]);

  const signInWithApple = useCallback(async () => {
    try {
      const result = await signInWithAppleNative();
      if (!result.ok) {
        if (result.reason === "unavailable") {
          const devUser = createDevAppleUser();
          const authed = await backendSignIn({
            email: devUser.email,
            password: DEV_OAUTH_PASSWORD,
            provider: "apple",
            displayName: devUser.displayName,
          });
          await completeSignIn(authed);
          return { ok: true, message: "Apple bu ortamda yok — backend dev oturumu açıldı." };
        }
        if (result.reason === "cancelled") return { ok: false, message: "Apple girişi iptal edildi." };
        return { ok: false, message: result.message ?? "Apple ile giriş başarısız." };
      }

      const authed = await backendSignIn({
        email: result.user.email,
        password: DEV_OAUTH_PASSWORD,
        provider: "apple",
        displayName: result.user.displayName,
      });
      await completeSignIn(authed);
      return { ok: true };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Apple girişi başarısız.";
      return { ok: false, message };
    }
  }, [completeSignIn]);

  const refreshProfile = useCallback(async () => {
    if (!user?.token) return;
    const profile = await fetchMe(user.token);
    const next = { ...user, onboardingComplete: profile.onboardingComplete, displayName: profile.displayName };
    await persistSession(next);
    setUser(next);
  }, [user]);

  const markOnboardingComplete = useCallback(() => {
    if (!user) return;
    const next = { ...user, onboardingComplete: true };
    void persistSession(next);
    setUser(next);
  }, [user]);

  const signOut = useCallback(async () => {
    await clearStoredSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isGoogleConfigured: isGoogleConfigured(),
      signInWithEmail,
      signInWithGoogle,
      signInWithApple,
      refreshProfile,
      markOnboardingComplete,
      signOut,
    }),
    [user, isLoading, signInWithEmail, signInWithGoogle, signInWithApple, refreshProfile, markOnboardingComplete, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth yalnızca AuthProvider içinde kullanılabilir.");
  return context;
}

export function providerLabel(provider: AuthProvider): string {
  if (provider === "google") return "Google";
  if (provider === "apple") return "Apple";
  return "E-posta";
}

export { AUTH_STORAGE_KEY };
