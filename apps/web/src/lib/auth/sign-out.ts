import type { AuthUser } from "./types";
import { clearStoredSession } from "./session";
import { executeSignOutCore, type SignOutOptions } from "./sign-out-core";

export type { SignOutOptions };

async function defaultLogout(accessToken: string, refreshToken: string): Promise<void> {
  const { logoutUser } = await import("../api/yuvmi");
  await logoutUser(accessToken, refreshToken);
}

export async function revokeServerSession(
  session: AuthUser,
  logout: (accessToken: string, refreshToken: string) => Promise<void> = defaultLogout,
): Promise<void> {
  if (!session.token || !session.refreshToken) return;
  try {
    await logout(session.token, session.refreshToken);
  } catch {
    // Best-effort server logout; local session is always cleared by the caller.
  }
}

export async function executeSignOut(
  session: AuthUser | null,
  options: SignOutOptions = {},
  deps: { logout?: (accessToken: string, refreshToken: string) => Promise<void> } = {},
): Promise<void> {
  const logout = deps.logout ?? defaultLogout;
  await executeSignOutCore(session, options, {
    logout,
    clear: clearStoredSession,
  });
}
