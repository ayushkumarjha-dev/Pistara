// Authentication API calls

const API_BASE = "/api";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data.error || {};
    throw {
      code: error.code || "UNKNOWN_ERROR",
      message: error.message || "An error occurred",
      details: error.details,
    };
  }

  return data.data;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  avatar_url: string | null;
  mobile: string | null;
  isComplete?: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<{ user: User }> {
  return fetchAPI("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(input: LoginInput): Promise<{ user: User }> {
  return fetchAPI("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<{ success: boolean }> {
  return fetchAPI("/auth/logout", {
    method: "POST",
  });
}

export async function getCurrentUser(): Promise<{ user: User | null }> {
  try {
    return await fetchAPI("/auth/me");
  } catch {
    return { user: null };
  }
}
