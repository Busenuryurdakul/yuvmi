import { APP_NAME } from "@yuvmi/shared";

export function LandingFooter() {
  return (
    <footer className="landing-footer border-t border-foreground/8 py-8 text-center text-sm text-muted">
      <p>
        © {new Date().getFullYear()} {APP_NAME}. Tüm hakları saklıdır.
      </p>
    </footer>
  );
}
