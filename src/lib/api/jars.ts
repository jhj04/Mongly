import { api } from "@/lib/axios";

export interface EmotionMaster {
  id: number;
  name: string;
  colorHex: string;
  sortOrder: number;
}

export interface EmotionsResponse {
  emotions: EmotionMaster[];
}

// 인증 불필요, 앱 시작 시 1회 로드해서 렌더링/색 조합의 원천으로 사용
export const getEmotions = () =>
  api.get<EmotionsResponse>("/api/emotions").then((res) => res.data);

export interface JarEmotionCount {
  emotionId: number;
  name: string;
  colorHex: string;
  count: number;
}

export interface Jar {
  id: string;
  recordDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  canEdit: boolean;
  canLike: boolean;
  likeCount: number;
  likedByMe: boolean;
  dominantEmotionId: number | null;
  emotions: JarEmotionCount[];
}

export interface JarDraft {
  total: number;
  dominantEmotionId: number | null;
  emotions: JarEmotionCount[];
}

export interface TodayJarResponse {
  jar: Jar | null;
  draft: JarDraft | null;
}

// 몽글리 탭 진입 시 1회 호출 — 완성 전이면 draft, 완성 후면 jar가 채워짐
export const getTodayJar = () =>
  api.get<TodayJarResponse>("/api/jars/today").then((res) => res.data);

export interface AddDraftEmotionRequest {
  emotionId: number;
}

// 드래그 1회 = 감정 담기(즉시 DB 저장). 응답은 갱신된 드래프트 전체.
// 최대 7개(DRAFT_FULL), 오늘 이미 완성(JAR_ALREADY_TODAY)이면 409
export const addDraftEmotion = (data: AddDraftEmotionRequest) =>
  api.post<JarDraft>("/api/jars/draft/emotions", data).then((res) => res.data);

// 되돌리기 — 마지막에 담은 감정 1개 제거. 응답은 갱신된 드래프트.
export const removeDraftEmotion = () =>
  api.delete<JarDraft>("/api/jars/draft/emotions").then((res) => res.data);

// 완성하기 — 오늘 드래프트를 유리병으로 확정하고 드래프트는 비움.
// note는 선택(한 줄, 최대 50 grapheme). 담은 감정 없으면 DRAFT_EMPTY, 오늘 이미 완성했으면 JAR_ALREADY_TODAY
export interface CompleteJarRequest {
  note?: string | null;
}

export const completeJar = (data?: CompleteJarRequest) =>
  api.post<Jar>("/api/jars", data ?? {}).then((res) => res.data);

// 오늘 유리병 수정 — 본인 소유 + KST 오늘 기록일 때만(canEdit). expectedVersion 필수.
// note/emotions 중 하나 이상 필요. 버전 불일치는 409 JAR_VERSION_CONFLICT, 자정 지나면 409 JAR_EDIT_WINDOW_CLOSED
export interface EditEmotionInput {
  emotionId: number;
  count: number;
}

export interface EditJarRequest {
  expectedVersion: number;
  note?: string | null;
  emotions?: EditEmotionInput[];
}

export const editJar = (id: string, data: EditJarRequest) =>
  api.patch<Jar>(`/api/jars/${id}`, data).then((res) => res.data);

export interface LikeJarResponse {
  jarId: string;
  likeCount: number;
  likedByMe: boolean;
}

// 좋아요 설정/취소(멱등) — 현재 친구의 병에만 가능(canLike). 분당 60회(설정+취소 합산) 제한.
export const likeJar = (id: string) =>
  api.put<LikeJarResponse>(`/api/jars/${id}/like`).then((res) => res.data);

export const unlikeJar = (id: string) =>
  api.delete<LikeJarResponse>(`/api/jars/${id}/like`).then((res) => res.data);

export interface JarsListResponse {
  jars: Jar[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface GetJarsParams {
  limit?: number;
  cursor?: string;
}

// 서재 — 내 유리병 목록(날짜 내림차순, 저장 총량 무제한). 커서 기반 페이지네이션(limit 기본 7, 최대 50)
export const getJars = (params?: GetJarsParams) =>
  api.get<JarsListResponse>("/api/jars", { params }).then((res) => res.data);

// 유리병 상세 — 본인 또는 친구만 조회 가능
export const getJar = (id: string) => api.get<Jar>(`/api/jars/${id}`).then((res) => res.data);

// 삭제하기 — 본인 소유 유리병만
export const deleteJar = (id: string) =>
  api.delete<{ ok: boolean }>(`/api/jars/${id}`).then((res) => res.data);

// 유리병 PNG — 서재·친구 탭 렌더용. 본인 또는 친구만. <img src>에 바로 사용
export const getJarImageUrl = (id: string) => `/api/jars/${id}/image`;
