import type { AuthUser } from "./types";

export type SignOutOptions = {
  /** Skip server revoke — used after delete-account which already revokes all refresh tokens. */
  localOnly?: boolean;
};

type LogoutFn = (accessToken: string, refreshToken: string) => Promise<void>;

export async function executeSignOutCore(
  session: Pick<AuthUser, "token" | "refreshToken"> | null,
  options: SignOutOptions,
  deps: { logout: LogoutFn; clear: () => void },
): Promise<void> {
  if (!options.localOnly && session?.token && session.refreshToken) {
    try {
      await deps.logout(session.token, session.refreshToken);
    } catch {
      // Best-effort server logout; local session is always cleared by the caller.
    }
  }
  deps.clear();
}
