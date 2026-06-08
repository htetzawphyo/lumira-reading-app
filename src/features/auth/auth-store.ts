import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const authStorageKey = "lumira.auth.session.v1";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: "FREE" | "PREMIUM";
  storageUsedBytes: string;
  storageLimitBytes: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthState = {
  session: AuthSession | null;
  hydrated: boolean;
  setSession: (session: AuthSession | null) => Promise<void>;
  hydrate: () => Promise<AuthSession | null>;
  signOutLocal: () => Promise<void>;
};

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(authStorageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(authStorageKey);
    return null;
  }
}

export async function saveAuthSession(session: AuthSession | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(authStorageKey);
    useAuthStore.setState({ session: null, hydrated: true });
    return;
  }

  await SecureStore.setItemAsync(authStorageKey, JSON.stringify(session));
  useAuthStore.setState({ session, hydrated: true });
}

export function isPremiumAuthSession(session = useAuthStore.getState().session) {
  return session?.user.plan === "PREMIUM";
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  setSession: async (session) => {
    await saveAuthSession(session);
  },
  hydrate: async () => {
    const session = await getStoredAuthSession();
    set({ session, hydrated: true });
    return session;
  },
  signOutLocal: async () => {
    await saveAuthSession(null);
  },
}));
