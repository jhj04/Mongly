"use client";

import { useEffect, useState } from "react";
import {
  getEmotions,
  getTodayJar,
  addDraftEmotion,
  removeDraftEmotion,
  completeJar,
  getJars,
  getJar,
  deleteJar,
  EmotionMaster,
  Jar,
  JarDraft,
  AddDraftEmotionRequest,
  CompleteJarRequest,
} from "@/lib/api/jars";
import { ApiError } from "@/lib/axios";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({ code: "NETWORK_ERROR", message: "네트워크 오류가 발생했어요." });
}

// 감정 팔레트 10종 — 인증 불필요, 앱 시작 시 1회 로드
export function useEmotions() {
  const [emotions, setEmotions] = useState<EmotionMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getEmotions();
      setEmotions(result.emotions);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  return { emotions, isLoading, error, refetch };
}

// 몽글리 탭 진입 시 오늘(KST) 상태 조회 — 완성 전이면 draft, 완성 후면 jar
export function useTodayJar() {
  const [jar, setJar] = useState<Jar | null>(null);
  const [draft, setDraft] = useState<JarDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getTodayJar();
      setJar(result.jar);
      setDraft(result.draft);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  return { jar, draft, isLoading, error, refetch };
}

// 드래그 1회 = 감정 담기. 응답은 갱신된 드래프트 전체(즉시 DB 저장됨)
export function useAddDraftEmotion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: AddDraftEmotionRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const draft = await addDraftEmotion(data);
      return { draft, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { draft: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { addDraftEmotion: submit, isLoading, error };
}

// 되돌리기 — 마지막에 담은 감정 1개 제거
export function useRemoveDraftEmotion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const draft = await removeDraftEmotion();
      return { draft, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { draft: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { removeDraftEmotion: submit, isLoading, error };
}

// 완성하기 — 렌더한 유리병 PNG와 함께 오늘 드래프트를 유리병으로 확정. 서재가 가득 찼으면(JAR_LIMIT)
// error.details.jars에 현재 서재 목록이 함께 내려옴(드래프트는 유지됨).
export function useCompleteJar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (data: CompleteJarRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const jar = await completeJar(data);
      return { jar, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { jar: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { completeJar: submit, isLoading, error };
}

// 서재 — 내 유리병 목록(최대 7개, 날짜 내림차순)
export function useJarsList() {
  const [jars, setJars] = useState<Jar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getJars();
      setJars(result.jars);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  return { jars, isLoading, error, refetch };
}

// 유리병 상세 — 클릭 시 id로 조회(본인 또는 친구 소유만 가능)
export function useJarDetail() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchJar = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const jar = await getJar(id);
      return { jar, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { jar: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { fetchJar, isLoading, error };
}

// 삭제하기 — 본인 소유 유리병만
export function useDeleteJar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteJar(id);
      return { ok: true, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { ok: false, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteJar: submit, isLoading, error };
}
