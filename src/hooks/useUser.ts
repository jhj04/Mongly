"use client";

import { useState } from "react";
import {
  checkLoginId,
  updateLoginId,
  updatePassword,
  deleteAccount,
  UpdateLoginIdRequest,
  UpdatePasswordRequest,
  DeleteAccountRequest,
} from "@/lib/api/user";
import { ApiError } from "@/lib/axios";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({ code: "NETWORK_ERROR", message: "네트워크 오류가 발생했어요." });
}

export function useCheckLoginId() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (loginId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { available } = await checkLoginId(loginId);
      return { available, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { available: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { checkLoginId: submit, isLoading, error };
}

export function useUpdateLoginId() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: UpdateLoginIdRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateLoginId(data);
      return { loginId: result.loginId, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { loginId: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { updateLoginId: submit, isLoading, error };
}

export function useUpdatePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: UpdatePasswordRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await updatePassword(data);
      return { ok: true, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { ok: false, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { updatePassword: submit, isLoading, error };
}

export function useDeleteAccount() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: DeleteAccountRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteAccount(data);
      return { ok: true, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { ok: false, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteAccount: submit, isLoading, error };
}
