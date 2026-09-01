export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateChangePasswordInput(
  input: ChangePasswordInput,
): ChangePasswordValidationResult {
  if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
    return { ok: false, message: "Tüm alanlar zorunlu." };
  }
  if (input.newPassword.length < 8) {
    return { ok: false, message: "Yeni şifre en az 8 karakter olmalı." };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, message: "Yeni şifreler eşleşmiyor." };
  }
  if (input.newPassword === input.currentPassword) {
    return { ok: false, message: "Yeni şifre mevcut şifreden farklı olmalı." };
  }
  return { ok: true };
}
