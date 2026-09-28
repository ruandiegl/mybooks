type SignOutSessionInput = {
  refreshToken: string | null;
  cookieSession: boolean;
  revoke: (refreshToken: string | null) => Promise<unknown>;
  clearLocalSession: () => Promise<void>;
};

export async function signOutSession({ refreshToken, cookieSession, revoke, clearLocalSession }: SignOutSessionInput) {
  if (refreshToken || cookieSession) await revoke(refreshToken);
  await clearLocalSession();
}
