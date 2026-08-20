import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordView } from "@/components/app/ResetPasswordView";
import { AppLoading } from "@/components/app/ui";

export const metadata: Metadata = {
  title: "Şifre sıfırlama",
  description: "Yuvmi hesabın için yeni şifre belirle.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="app-auth-screen">
          <AppLoading label="Yükleniyor…" />
        </div>
      }
    >
      <ResetPasswordView />
    </Suspense>
  );
}
