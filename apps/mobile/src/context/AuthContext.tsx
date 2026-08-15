import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, setSessionTokenListener } from "@/lib/api/client";
import {
  fetchMe,
  loginUser,
  oauthLogin,
  refreshAuthToken,
  registerUser,
} from "@/lib/api/yuvmi";
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
import {
  AUTH_STORAGE_KEY,
  DEV_OAUTH_PASSWORD,
  isDevAuthAllowed,
  type AuthProvider,
  type AuthUser,
} from "@/lib/auth/types";

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
  updateTokens: (token: string, refreshToken: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(
  login: { token: string; refresh_token: string },
  profile: Awaited<ReturnType<typeof fetchMe>>,
  provider: AuthProvider,
  displayName: string,
): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName || displayName,
    provider,
    token: login.token,
    refreshToken: login.refresh_token,
    onboardingComplete: profile.onboardingComplete,
  };
}

async function devBridgeSignIn(input: {
  email: string;
  provider: AuthProvider;
  displayName: string;
}): Promise<AuthUser> {
  let login;
  try {
    login = await loginUser(input.email, DEV_OAUTH_PASSWORD);
  } catch (error) {
    if (error instanceof ApiError && error.code === 401) {
      await registerUser({
        email: input.email,
        password: DEV_OAUTH_PASSWORD,
        firstName: input.displayName.split(" ")[0] ?? "Yuvmi",
        lastName: input.displayName.split(" ").slice(1).join(" ") || "Kullanıcı",
      });
      login = await loginUser(input.email, DEV_OAUTH_PASSWORD);
    } else {
      throw error;
    }
  }
  const profile = await fetchMe(login.token);
  return toAuthUser(login, profile, input.provider, input.displayName);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { request, promptAsync } = useGoogleAuthRequest();

  const updateTokens = useCallback(async (token: string, refreshToken: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, token, refreshToken };
      void persistSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setSessionTokenListener((tokens) => {
      void updateTokens(tokens.token, tokens.refreshToken);
    });
    return () => setSessionTokenListener(null);
  }, [updateTokens]);

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
        if (session.refreshToken) {
          try {
            const refreshed = await refreshAuthToken(session.refreshToken);
            const profile = await fetchMe(refreshed.token);
            const next = toAuthUser(refreshed, profile, session.provider, session.displayName);
            await persistSession(next);
            setUser(next);
            if (mounted) setIsLoading(false);
            return;
          } catch {
            // fall through
          }
        }
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
        const login = await loginUser(input.email, input.password);
        const profile = await fetchMe(login.token);
        await completeSignIn(
          toAuthUser(
            login,
            profile,
            "email",
            `${input.firstName ?? "Yuvmi"} ${input.lastName ?? ""}`.trim(),
          ),
        );
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
        if (!isDevAuthAllowed()) {
          return { ok: false, message: "Google OAuth yapılandırılmamış." };
        }
        const devUser = createDevGoogleUser();
        const authed = await devBridgeSignIn({
          email: devUser.email,
          provider: "google",
          displayName: devUser.displayName,
        });
        await completeSignIn(authed);
        return { ok: true, message: "Google yapılandırması yok — dev oturumu açıldı." };
      }

      const result = await promptGoogleSignIn(promptAsync, request);
      if (!result.ok) {
        if (result.reason === "cancelled") return { ok: false, message: "Google girişi iptal edildi." };
        return { ok: false, message: result.message ?? "Google ile giriş başarısız." };
      }

      const login = await oauthLogin({
        provider: "google",
        idToken: result.idToken,
        firstName: result.user.displayName.split(" ")[0],
        lastName: result.user.displayName.split(" ").slice(1).join(" "),
      });
      const profile = await fetchMe(login.token);
      await completeSignIn(toAuthUser(login, profile, "google", result.user.displayName));
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
          if (!isDevAuthAllowed()) {
            return { ok: false, message: "Apple girişi bu ortamda kullanılamıyor." };
          }
          const devUser = createDevAppleUser();
          const authed = await devBridgeSignIn({
            email: devUser.email,
            provider: "apple",
            displayName: devUser.displayName,
          });
          await completeSignIn(authed);
          return { ok: true, message: "Apple bu ortamda yok — dev oturumu açıldı." };
        }
        if (result.reason === "cancelled") return { ok: false, message: "Apple girişi iptal edildi." };
        return { ok: false, message: result.message ?? "Apple ile giriş başarısız." };
      }

      const login = await oauthLogin({
        provider: "apple",
        idToken: result.identityToken,
        firstName: result.user.displayName.split(" ")[0],
        lastName: result.user.displayName.split(" ").slice(1).join(" "),
      });
      const profile = await fetchMe(login.token);
      await completeSignIn(toAuthUser(login, profile, "apple", result.user.displayName));
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
      updateTokens,
    }),
    [user, isLoading, signInWithEmail, signInWithGoogle, signInWithApple, refreshProfile, markOnboardingComplete, signOut, updateTokens],
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
