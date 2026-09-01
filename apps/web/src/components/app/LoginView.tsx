"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { APP_NAME, APP_TAGLINE } from "@yuvmi/shared";
import { YuvmiLogo } from "@/components/manifesto/variants/YuvmiLogo";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api/config";
import { forgotPassword } from "@/lib/api/yuvmi";
import { getLoginPasswordUpdatedBanner } from "@/lib/auth/login-banners";
import { AppButton, AppInput } from "./ui";

export function LoginView() {
  const { signInWithEmail } = useAuth();
  const searchParams = useSearchParams();
  const passwordUpdatedBanner = getLoginPasswordUpdatedBanner(searchParams);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("E-posta gerekli.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (mode === "register" && (!firstName.trim() || !lastName.trim())) {
      setError("Kayıt için ad ve soyad gerekli.");
      return;
    }

    setLoading(true);
    const result = await signInWithEmail({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mode,
    });
    if (!result.ok) setError(result.message ?? "Giriş yapılamadı.");
    setLoading(false);
  }

  async function handleForgot() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Şifre sıfırlamak için e-posta gir.");
      return;
    }
    setResetting(true);
    try {
      const result = await forgotPassword(email.trim());
      setInfo(result.message || "Sıfırlama bağlantısı e-postana gönderildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sıfırlama isteği gönderilemedi.");
    } finally {
      setResetting(false);
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
        <h1 className="app-auth-title">{mode === "login" ? "Giriş" : "Kayıt"}</h1>
        <p className="app-muted">
          Mobil ve web aynı hesabı kullanır. Daha önce uygulamadan kayıt olduysan aynı e-posta ile giriş yap.
        </p>

        {!isApiConfigured() ? (
          <p className="app-banner app-banner-warn" role="alert">
            API adresi yapılandırılmamış. `NEXT_PUBLIC_API_BASE_URL` gerekli.
          </p>
        ) : null}
        {passwordUpdatedBanner ? (
          <p className="app-banner app-banner-ok" role="status">
            {passwordUpdatedBanner}
          </p>
        ) : null}

        <form className="app-form" onSubmit={(event) => void handleSubmit(event)}>
          {mode === "register" ? (
            <div className="app-form-row">
              <AppInput
                label="Ad"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
              <AppInput
                label="Soyad"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>
          ) : null}
          <AppInput
            label="E-posta"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          <AppInput
            label="Şifre"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {error ? (
            <p className="app-banner app-banner-error" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="app-banner app-banner-ok" role="status">
              {info}
            </p>
          ) : null}
          <AppButton type="submit" loading={loading} disabled={!isApiConfigured()}>
            {mode === "login" ? "Giriş yap" : "Kayıt ol"}
          </AppButton>
        </form>

        <button
          type="button"
          className="app-text-btn landing-focus-ring"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
        </button>
        {mode === "login" ? (
          <button
            type="button"
            className="app-text-btn landing-focus-ring"
            onClick={() => void handleForgot()}
            disabled={resetting}
          >
            {resetting ? "Gönderiliyor…" : "Şifreni mi unuttun?"}
          </button>
        ) : null}

        <Link href="/" className="app-text-btn landing-focus-ring">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
