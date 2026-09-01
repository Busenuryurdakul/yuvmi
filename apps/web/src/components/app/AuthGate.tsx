"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  APP_LOGIN_PATH,
  APP_ONBOARDING_PATH,
  resolveAppDestination,
  isLoginSuccessScreen,
} from "@/lib/auth/app-route";
import { AppLoading } from "./ui";
import { AppShell } from "./AppShell";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const effectivePathname =
    typeof window !== "undefined" ? window.location.pathname : pathname;
  const loginSearch =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : undefined;
  const destination = resolveAppDestination(
    effectivePathname,
    {
      isLoading,
      user: user ? { onboardingComplete: user.onboardingComplete } : null,
    },
    loginSearch,
  );

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (isLoading) {
    return (
      <div className="app-auth-screen">
        <AppLoading label="Oturum kontrol ediliyor…" />
      </div>
    );
  }

  if (!user && effectivePathname !== APP_LOGIN_PATH) {
    return (
      <div className="app-auth-screen">
        <AppLoading label="Girişe yönlendiriliyor…" />
      </div>
    );
  }

  if (user && !user.onboardingComplete && effectivePathname !== APP_ONBOARDING_PATH) {
    return (
      <div className="app-auth-screen">
        <AppLoading label="Kuruluma yönlendiriliyor…" />
      </div>
    );
  }

  if (user?.onboardingComplete && (effectivePathname === APP_LOGIN_PATH || effectivePathname === APP_ONBOARDING_PATH)) {
    if (isLoginSuccessScreen(effectivePathname, loginSearch, user)) {
      return <>{children}</>;
    }
    return (
      <div className="app-auth-screen">
        <AppLoading label="Uygulamaya yönlendiriliyor…" />
      </div>
    );
  }

  if (effectivePathname === APP_LOGIN_PATH || effectivePathname === APP_ONBOARDING_PATH) {
    return <>{children}</>;
  }

  if (!user?.onboardingComplete) {
    return (
      <div className="app-auth-screen">
        <AppLoading />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
