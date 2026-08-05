"use client";

import { useEffect, useState } from "react";
import { login, signup, logout, getMe, LoginRequest, SignupRequest, AuthUser } from "@/lib/api/auth";
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

// 현재 로그인한 사용자 정보 조회 — 마운트 시 1회 조회
export function useMe() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((e) => {
        if (!cancelled) setError(toApiError(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isLoading, error };
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
