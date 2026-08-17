"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  APP_LOGIN_PATH,
  APP_ONBOARDING_PATH,
  resolveAppDestination,
} from "@/lib/auth/app-route";
import { AppLoading } from "./ui";
import { AppShell } from "./AppShell";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const destination = resolveAppDestination(pathname, {
    isLoading,
    user: user ? { onboardingComplete: user.onboardingComplete } : null,
  });

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

  if (!user && pathname !== APP_LOGIN_PATH) {
    return (
      <div className="app-auth-screen">
        <AppLoading label="Girişe yönlendiriliyor…" />
      </div>
    );
  }

  if (user && !user.onboardingComplete && pathname !== APP_ONBOARDING_PATH) {
    return (
      <div className="app-auth-screen">
        <AppLoading label="Kuruluma yönlendiriliyor…" />
      </div>
    );
  }

  if (user?.onboardingComplete && (pathname === APP_LOGIN_PATH || pathname === APP_ONBOARDING_PATH)) {
    return (
      <div className="app-auth-screen">
        <AppLoading label="Uygulamaya yönlendiriliyor…" />
      </div>
    );
  }

  if (pathname === APP_LOGIN_PATH || pathname === APP_ONBOARDING_PATH) {
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
