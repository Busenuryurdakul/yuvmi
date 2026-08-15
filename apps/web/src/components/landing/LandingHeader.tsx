import Link from "next/link";
import { APP_NAME } from "@yuvmi/shared";
import { YuvmiLogo } from "@/components/manifesto/variants/YuvmiLogo";
import { LandingMobileNav } from "./LandingMobileNav";
import { LANDING_NAV } from "./landing-content";

function NavLinks({ className }: { className?: string }) {
  return (
    <>
      {LANDING_NAV.map((item) =>
        item.href.startsWith("/") ? (
          <Link
            key={item.href}
            href={item.href}
            className={className}
          >
            {item.label}
          </Link>
        ) : (
          <a key={item.href} href={item.href} className={className}>
            {item.label}
          </a>
        ),
      )}
    </>
  );
}

export function LandingHeader() {
  return (
    <header className="landing-header sticky top-0 z-50 border-b border-foreground/6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <Link
          href="/"
          className="landing-focus-ring flex shrink-0 items-center gap-2.5 rounded-lg"
          aria-label={`${APP_NAME} ana sayfa`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm ring-1 ring-foreground/8">
            <YuvmiLogo size={24} />
          </span>
          <span className="text-lg font-semibold tracking-tight sm:text-xl">{APP_NAME}</span>
        </Link>

        <nav
          className="hidden items-center gap-7 text-sm text-muted md:flex"
          aria-label="Ana navigasyon"
        >
          <NavLinks className="landing-focus-ring rounded-md transition-colors hover:text-foreground" />
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LandingMobileNav />

          <Link
            href="#bekleme"
            className="landing-focus-ring rounded-full bg-accent px-3.5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 sm:px-5"
          >
            <span className="hidden min-[420px]:inline">Bekleme listesine katıl</span>
            <span className="min-[420px]:hidden">Katıl</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
