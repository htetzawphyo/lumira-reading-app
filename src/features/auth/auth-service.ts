import { apiRequest } from "@/features/api/api-client";
import { getStoredAuthSession, saveAuthSession } from "@/features/auth/auth-store";
import type { AuthSession, AuthUser } from "@/features/auth/auth-store";

export async function loginWithGoogleIdToken(idToken: string) {
  const session = await apiRequest<AuthSession>("/auth/google", {
    auth: false,
    method: "POST",
    body: JSON.stringify({
      idToken,
      device: {
        platform: process.env.EXPO_OS ?? "unknown",
        appVersion: "1.0.0",
      },
    }),
  });

  await saveAuthSession(session);
  return session;
}

export async function logoutFromBackend() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Local sign-out should still succeed if the backend is unavailable.
  } finally {
    await saveAuthSession(null);
  }
}

export async function refreshCurrentUser() {
  const session = await getStoredAuthSession();

  if (!session) {
    return null;
  }

  const user = await apiRequest<AuthUser>("/users/me");
  await saveAuthSession({ ...session, user });
  return user;
}
