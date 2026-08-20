import { getApiBaseUrl } from "./config";

export type WaitlistErrorKind =
  | "VALIDATION"
  | "RATE_LIMIT"
  | "SERVER"
  | "NETWORK"
  | "CONFIGURATION";

export class WaitlistError extends Error {
  readonly kind: WaitlistErrorKind;

  constructor(kind: WaitlistErrorKind, message: string) {
    super(message);
    this.name = "WaitlistError";
    this.kind = kind;
  }
}

export type WaitlistSignupResult = {
  status: "registered";
  message: string;
};

type WaitlistResponseBody = {
  status?: string;
  message?: string;
};

function mapResponseError(status: number): WaitlistError {
  if (status === 422) {
    return new WaitlistError(
      "VALIDATION",
      "Geçerli bir e-posta adresi gir ve onay kutusunu işaretle.",
    );
  }

  if (status === 429) {
    return new WaitlistError(
      "RATE_LIMIT",
      "Çok fazla deneme yaptın. Lütfen biraz sonra tekrar dene.",
    );
  }

  if (status >= 500) {
    return new WaitlistError(
      "SERVER",
      "Şu anda kaydını alamıyoruz. Lütfen biraz sonra tekrar dene.",
    );
  }

  return new WaitlistError(
    "VALIDATION",
    "Geçerli bir e-posta adresi gir ve onay kutusunu işaretle.",
  );
}

export async function submitWaitlistSignup(
  email: string,
  consent: boolean,
): Promise<WaitlistSignupResult> {
  const baseUrl = getApiBaseUrl();
  if (baseUrl === null) {
    throw new WaitlistError(
      "CONFIGURATION",
      "Erken erişim kaydı şu anda kullanılamıyor.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/public/waitlist`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, consent }),
    });
  } catch {
    throw new WaitlistError(
      "NETWORK",
      "Şu anda kaydını alamıyoruz. Lütfen biraz sonra tekrar dene.",
    );
  }

  let body: WaitlistResponseBody = {};
  try {
    const text = await response.text();
    body = text ? (JSON.parse(text) as WaitlistResponseBody) : {};
  } catch {
    if (!response.ok) {
      throw mapResponseError(response.status);
    }
  }

  if (response.status === 200 || response.status === 201) {
    return {
      status: "registered",
      message: body.message ?? "Bekleme listesine eklendin.",
    };
  }

  throw mapResponseError(response.status);
}
