"use client";

import { useEffect, useState } from "react";
import { LANDING_NAV } from "./landing-content";
import Link from "next/link";

function MobileNavLinks() {
  return (
    <>
      {LANDING_NAV.map((item) =>
        item.href.startsWith("/") ? (
          <Link
            key={item.href}
            href={item.href}
            className="landing-focus-ring block rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-foreground/5"
          >
            {item.label}
          </Link>
        ) : (
          <a
            key={item.href}
            href={item.href}
            className="landing-focus-ring block rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-foreground/5"
          >
            {item.label}
          </a>
        ),
      )}
    </>
  );
}

export function LandingMobileNav() {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mq.matches);

    const frame = requestAnimationFrame(sync);
    mq.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      mq.removeEventListener("change", sync);
    };
  }, []);

  if (!isMobileViewport) {
    return null;
  }

  return (
    <details className="landing-mobile-nav relative">
      <summary
        className="landing-focus-ring list-none rounded-full border border-foreground/12 bg-surface/70 px-3.5 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden"
        aria-label="Menüyü aç"
      >
        Menü
      </summary>
      <nav
        className="landing-mobile-nav-panel absolute right-0 top-[calc(100%+0.5rem)] min-w-[12rem] rounded-2xl border border-foreground/10 bg-surface p-2 shadow-lg"
        aria-label="Mobil navigasyon"
      >
        <MobileNavLinks />
      </nav>
    </details>
  );
}
