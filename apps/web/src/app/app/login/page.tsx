import { Suspense } from "react";
import { LoginView } from "@/components/app/LoginView";
import { AppLoading } from "@/components/app/ui";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="app-auth-screen">
          <AppLoading label="Yükleniyor…" />
        </div>
      }
    >
      <LoginView />
    </Suspense>
  );
}
