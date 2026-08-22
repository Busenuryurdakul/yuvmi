"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import { changePassword, deleteAccount } from "@/lib/api/yuvmi";
import { validateChangePasswordInput } from "@/lib/auth/change-password-validation";
import { APP_LOGIN_PASSWORD_CHANGED_PATH } from "@/lib/auth/login-banners";
import { AppButton, AppCard, AppInput } from "./ui";

export function SettingsView() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeLoading, setChangeLoading] = useState(false);

  if (!user) return null;

  async function handleChangePassword() {
    if (!user?.token) return;
    setChangeError(null);

    const validation = validateChangePasswordInput({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.ok) {
      setChangeError(validation.message);
      return;
    }

    setChangeLoading(true);
    try {
      await changePassword(user.token, currentPassword, newPassword);
      await signOut({ localOnly: true });
      router.replace(APP_LOGIN_PASSWORD_CHANGED_PATH);
    } catch (err) {
      setChangeError(err instanceof ApiError ? err.message : "Şifre değiştirilemedi.");
    } finally {
      setChangeLoading(false);
    }
  }

  async function handleDelete() {
    if (!user?.token) return;
    setError(null);
    setLoading(true);
    try {
      await deleteAccount(user.token, password || undefined);
      await signOut({ localOnly: true });
      router.replace("/app/login");
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
        <h2 className="app-card-title">Şifre değiştir</h2>
        <p className="app-muted">
          Şifreni değiştirdiğinde güvenlik için tüm cihazlardaki oturumların kapanır. Yeni şifrenle tekrar giriş
          yapman gerekir.
        </p>
        <div className="app-form">
          <AppInput
            label="Mevcut şifre"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
          />
          <AppInput
            label="Yeni şifre"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
          <AppInput
            label="Yeni şifre tekrar"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
          {changeError ? (
            <p className="app-banner app-banner-error" role="alert">
              {changeError}
            </p>
          ) : null}
          <AppButton
            loading={changeLoading}
            disabled={changeLoading}
            onClick={() => void handleChangePassword()}
          >
            Şifreyi güncelle
          </AppButton>
        </div>
      </AppCard>

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
