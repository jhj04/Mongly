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
  editJar,
  likeJar,
  unlikeJar,
  EmotionMaster,
  Jar,
  JarDraft,
  AddDraftEmotionRequest,
  EditJarRequest,
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

// 완성하기 — 오늘 드래프트를 유리병으로 확정. 한 줄 일기 모달에서 호출.
// note가 비어있으면 생략하고 전송(서버가 빈 문자열도 null로 처리하지만, 굳이 필드를 보내지 않음)
export function useCompleteJar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (note?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const trimmed = note?.trim();
      const jar = await completeJar(trimmed ? { note: trimmed } : undefined);
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

// 오늘 유리병의 한 줄 일기 수정 — 이번 스코프는 note만(emotions는 호출부에서 생략)
export function useEditJar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (id: string, data: EditJarRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const jar = await editJar(id, data);
      return { jar, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { jar: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { editJar: submit, isLoading, error };
}

// 친구 유리병 좋아요 토글 — 호출부(FriendsShelf)가 낙관적 업데이트 후 결과로 재조정함
export function useLikeJar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (id: string, like: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = like ? await likeJar(id) : await unlikeJar(id);
      return { result, error: null as ApiError | null };
    } catch (e) {
      const apiError = toApiError(e);
      setError(apiError);
      return { result: null, error: apiError };
    } finally {
      setIsLoading(false);
    }
  };

  return { setLike: submit, isLoading, error };
}

// 서재 — 내 유리병 목록(날짜 내림차순, 저장 총량 무제한).
// API는 커서 페이지네이션(최대 50개씩)이라 hasMore가 꺼질 때까지 이어서 불러와 전체 목록을 만듦.
const GET_JARS_PAGE_LIMIT = 50;

export function useJarsList() {
  const [jars, setJars] = useState<Jar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let all: Jar[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const result = await getJars({ limit: GET_JARS_PAGE_LIMIT, cursor });
        all = all.concat(result.jars);
        hasMore = result.hasMore;
        cursor = result.nextCursor ?? undefined;
      }
      setJars(all);
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
