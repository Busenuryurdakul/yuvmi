import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
import type { AuthProvider, AuthUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isGoogleConfigured: boolean;
  signInWithGoogle: () => Promise<{ ok: boolean; message?: string }>;
  signInWithApple: () => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function finalizeSignIn(user: AuthUser) {
  await persistSession(user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { request, promptAsync } = useGoogleAuthRequest();

  useEffect(() => {
    let mounted = true;

    loadStoredSession().then((session) => {
      if (mounted) {
        setUser(session);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const completeSignIn = useCallback(async (nextUser: AuthUser) => {
    await finalizeSignIn(nextUser);
    setUser(nextUser);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleConfigured()) {
      const devUser = createDevGoogleUser();
      await completeSignIn(devUser);
      return {
        ok: true,
        message: "Google yapılandırması yok — geliştirme oturumu açıldı.",
      };
    }

    const result = await promptGoogleSignIn(promptAsync, request);
    if (!result.ok) {
      if (result.reason === "cancelled") {
        return { ok: false, message: "Google girişi iptal edildi." };
      }
      return { ok: false, message: result.message ?? "Google ile giriş başarısız." };
    }

    await completeSignIn(result.user);
    return { ok: true };
  }, [completeSignIn, promptAsync, request]);

  const signInWithApple = useCallback(async () => {
    const result = await signInWithAppleNative();

    if (!result.ok) {
      if (result.reason === "unavailable") {
        const devUser = createDevAppleUser();
        await completeSignIn(devUser);
        return {
          ok: true,
          message: "Apple bu ortamda yok — geliştirme oturumu açıldı.",
        };
      }

      if (result.reason === "cancelled") {
        return { ok: false, message: "Apple girişi iptal edildi." };
      }

      return { ok: false, message: result.message ?? "Apple ile giriş başarısız." };
    }

    await completeSignIn(result.user);
    return { ok: true };
  }, [completeSignIn]);

  const signOut = useCallback(async () => {
    await clearStoredSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isGoogleConfigured: isGoogleConfigured(),
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [user, isLoading, signInWithGoogle, signInWithApple, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth yalnızca AuthProvider içinde kullanılabilir.");
  }
  return context;
}

export function providerLabel(provider: AuthProvider): string {
  return provider === "google" ? "Google" : "Apple";
}
