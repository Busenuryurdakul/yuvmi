import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME } from "@yuvmi/shared";
import { AppProviders } from "@/components/app/AppProviders";

export const metadata: Metadata = {
  title: `${APP_NAME} — Uygulama`,
  description: "Giriş yap, bugününü kaydet, gelecekteki kendine yaklaş.",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
