import { Platform } from "react-native";

import { getStoredAuthSession, saveAuthSession } from "@/features/auth/auth-store";

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL =
  explicitApiUrl ??
  (Platform.OS === "android"
    ? "http://10.0.2.2:3000/api"
    : "http://localhost:3000/api");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
  }
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshAccessToken() {
  const session = await getStoredAuthSession();

  if (!session?.refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    return null;
  }

  await saveAuthSession(payload);
  return payload as { accessToken: string };
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = true, retryOnUnauthorized = true, headers, ...requestOptions } = options;
  const session = auth ? await getStoredAuthSession() : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(headers ?? {}),
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    },
  });
  const payload = await parseResponse(response);

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();

    if (refreshed?.accessToken) {
      return apiRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  if (!response.ok) {
    throw new ApiError(
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "Request failed",
      response.status,
      payload,
    );
  }

  return payload as T;
}
