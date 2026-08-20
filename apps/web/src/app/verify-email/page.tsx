"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { APP_NAME } from "@yuvmi/shared";
import { verifyEmail } from "@/lib/api/yuvmi";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Doğrulama bağlantısı eksik.");
      return;
    }
    setStatus("busy");
    void verifyEmail(token)
      .then(() => {
        setStatus("ok");
        setMessage("E-posta doğrulandı. Giriş yapabilirsin.");
      })
      .catch((err: unknown) => {
        setStatus("err");
        setMessage(err instanceof Error ? err.message : "Doğrulama başarısız.");
      });
  }, [token]);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-sm text-muted hover:text-foreground">
        ← {APP_NAME}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">E-posta doğrulama</h1>
      <p className="mt-4 text-sm text-muted">{status === "busy" ? "Doğrulanıyor…" : message}</p>
      {status === "ok" ? (
        <Link href="/app/login" className="mt-8 text-sm text-accent hover:underline">
          Girişe git
        </Link>
      ) : null}
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">Yükleniyor…</main>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
