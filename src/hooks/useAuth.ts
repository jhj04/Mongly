"use client";

import { useState } from "react";
import { login, signup, logout, LoginRequest, SignupRequest, AuthUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/axios";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({ code: "NETWORK_ERROR", message: "네트워크 오류가 발생했어요." });
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(data);
      return { user, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { user: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { login: submit, isLoading, error };
}

export function useSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: SignupRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await signup(data);
      return { user, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { user: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { signup: submit, isLoading, error };
}

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await logout();
      return { ok: true, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { ok: false, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { logout: submit, isLoading, error };
}
