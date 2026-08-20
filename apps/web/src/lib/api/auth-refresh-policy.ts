type RefreshDecisionInput = {
  skipAuthRefresh?: boolean;
};

export function shouldAttemptAuthRefresh(
  status: number,
  retried: boolean,
  options: RefreshDecisionInput,
  refreshToken: string | null | undefined,
): boolean {
  return status === 401 && !retried && !options.skipAuthRefresh && Boolean(refreshToken);
}
