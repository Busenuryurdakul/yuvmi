"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function AppCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`app-card ${className}`.trim()}>{children}</section>;
}

export function AppButton({
  children,
  loading = false,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      {...props}
      type={type}
      className={`app-btn app-btn-${variant} ${className}`.trim()}
      disabled={disabled || loading}
    >
      {loading ? "Bekle…" : children}
    </button>
  );
}

export function AppInput({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="app-field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

export function AppTextarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="app-field">
      <span>{label}</span>
      <textarea {...props} />
    </label>
  );
}

export function AppLoading({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <span className="app-spinner" aria-hidden />
      {label}
    </div>
  );
}

export function AppEmpty({ title, body }: { title: string; body: string }) {
  return (
    <AppCard>
      <p className="app-kicker">Boş</p>
      <h2 className="app-card-title">{title}</h2>
      <p className="app-muted">{body}</p>
    </AppCard>
  );
}

export function AlignmentRing({ score, size = 132 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className="app-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <circle cx="60" cy="60" r={radius} className="app-ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="app-ring-value"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="app-ring-label">
        <strong>{clamped}</strong>
        <span>hizalanma</span>
      </div>
    </div>
  );
}
