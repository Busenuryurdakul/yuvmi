"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { APP_NAME } from "@yuvmi/shared";
import { YuvmiLogo } from "@/components/manifesto/variants/YuvmiLogo";
import { useAuth } from "@/context/AuthContext";
import { APP_LOGIN_PATH } from "@/lib/auth/app-route";
import type { ReactNode } from "react";

const NAV = [
  { href: "/app", label: "Bugün" },
  { href: "/app/future-self", label: "Gelecekteki Ben" },
  { href: "/app/progress", label: "İlerleme" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  function handleSignOut() {
    signOut();
    router.replace(APP_LOGIN_PATH);
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link href="/app" className="app-brand landing-focus-ring">
          <span className="app-brand-mark">
            <YuvmiLogo size={22} />
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <nav className="app-top-nav" aria-label="Uygulama">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-nav-link landing-focus-ring ${isActive(pathname, item.href) ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app-top-actions">
          <span className="app-user-name">{user?.displayName}</span>
          <button type="button" className="app-text-btn landing-focus-ring" onClick={handleSignOut}>
            Çıkış
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="app-bottom-nav" aria-label="Uygulama">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`app-bottom-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
