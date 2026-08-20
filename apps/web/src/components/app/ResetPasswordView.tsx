"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { APP_NAME, APP_TAGLINE } from "@yuvmi/shared";
import { YuvmiLogo } from "@/components/manifesto/variants/YuvmiLogo";
import { ApiError } from "@/lib/api/client";
import { isApiConfigured } from "@/lib/api/config";
import { resetPassword } from "@/lib/api/yuvmi";
import { APP_LOGIN_PATH } from "@/lib/auth/app-route";
import { AppButton, AppInput } from "./ui";

export function ResetPasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Geçersiz sıfırlama bağlantısı.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      router.replace(`${APP_LOGIN_PATH}?reset=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-auth-screen">
      <div className="app-auth-card">
        <Link href="/" className="app-brand landing-focus-ring">
          <span className="app-brand-mark">
            <YuvmiLogo size={26} />
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <p className="app-auth-tagline">{APP_TAGLINE}</p>
        <h1 className="app-auth-title">Yeni şifre</h1>
        <p className="app-muted">Hesabın için yeni bir şifre belirle. Bağlantı 1 saat geçerlidir.</p>

        {!isApiConfigured() ? (
          <p className="app-banner app-banner-warn" role="alert">
            API adresi yapılandırılmamış. `NEXT_PUBLIC_API_BASE_URL` gerekli.
          </p>
        ) : null}

        {!token ? (
          <p className="app-banner app-banner-error" role="alert">
            Sıfırlama bağlantısı eksik veya geçersiz. E-postadaki linki kullan veya yeni bir sıfırlama iste.
          </p>
        ) : null}

        <form className="app-form" onSubmit={(event) => void handleSubmit(event)}>
          <AppInput
            label="Yeni şifre"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            disabled={!token}
          />
          <AppInput
            label="Şifreyi tekrarla"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            disabled={!token}
          />
          {error ? (
            <p className="app-banner app-banner-error" role="alert">
              {error}
            </p>
          ) : null}
          <AppButton type="submit" loading={loading} disabled={!isApiConfigured() || !token}>
            Şifreyi güncelle
          </AppButton>
        </form>

        <Link href={APP_LOGIN_PATH} className="app-text-btn landing-focus-ring">
          Girişe dön
        </Link>
      </div>
    </div>
  );
}
