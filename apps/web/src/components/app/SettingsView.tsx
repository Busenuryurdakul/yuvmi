"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import { deleteAccount } from "@/lib/api/yuvmi";
import { APP_LOGIN_PATH } from "@/lib/auth/app-route";
import { AppButton, AppCard, AppInput } from "./ui";

export function SettingsView() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!user) return null;

  async function handleDelete() {
    if (!user?.token) return;
    setError(null);
    setLoading(true);
    try {
      await deleteAccount(user.token, password || undefined);
      await signOut({ localOnly: true });
      router.replace(APP_LOGIN_PATH);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Hesap silinemedi.");
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <p className="app-kicker">Ayarlar</p>
        <h1>Hesap</h1>
        <p className="app-muted">{user.email}</p>
      </header>

      <AppCard>
        <h2 className="app-card-title">Hesabı sil</h2>
        <p className="app-muted">
          KVKK/GDPR kapsamında tüm kişisel verilerin kalıcı olarak silinir. Bu işlem geri alınamaz.
        </p>

        {!confirmOpen ? (
          <AppButton variant="secondary" onClick={() => setConfirmOpen(true)}>
            Hesabımı sil…
          </AppButton>
        ) : (
          <div className="app-form">
            <AppInput
              label="Mevcut şifren (doğrulama)"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            {error ? (
              <p className="app-banner app-banner-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="app-form-row">
              <AppButton variant="secondary" onClick={() => setConfirmOpen(false)} disabled={loading}>
                Vazgeç
              </AppButton>
              <AppButton
                variant="secondary"
                loading={loading}
                disabled={password.length < 8}
                onClick={() => void handleDelete()}
              >
                Kalıcı olarak sil
              </AppButton>
            </div>
          </div>
        )}
      </AppCard>

      <Link href="/app" className="app-text-btn landing-focus-ring">
        Uygulamaya dön
      </Link>
    </div>
  );
}
