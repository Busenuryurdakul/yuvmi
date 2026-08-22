export const LOGIN_PASSWORD_UPDATED_MESSAGE =
  "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.";

export function getLoginPasswordUpdatedBanner(
  params: Pick<URLSearchParams, "get">,
): string | null {
  if (params.get("passwordChanged") === "1" || params.get("reset") === "1") {
    return LOGIN_PASSWORD_UPDATED_MESSAGE;
  }
  return null;
}

export const APP_LOGIN_PASSWORD_CHANGED_PATH = "/app/login?passwordChanged=1";
