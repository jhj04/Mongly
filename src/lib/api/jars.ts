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

export interface CompleteJarRequest {
  // canvas.toDataURL('image/png') 값(순수 base64도 허용), 원본 1MB 이하
  image: string;
}

// 완성하기 — 프론트가 렌더한 유리병 PNG와 함께 오늘 드래프트를 유리병으로 확정하고 드래프트는 비움.
// 담은 감정 없으면 DRAFT_EMPTY, image 누락은 VALIDATION, PNG 아니거나 base64 오류는 IMAGE_INVALID(400)
// 원본 1MB 초과는 IMAGE_TOO_LARGE(413)
// 오늘 이미 완성했으면 JAR_ALREADY_TODAY, 서재가 가득 찼으면 JAR_LIMIT(409, details.jars에 현재 목록)
export const completeJar = (data: CompleteJarRequest) =>
  api.post<Jar>("/api/jars", data).then((res) => res.data);

export interface JarsListResponse {
  jars: Jar[];
}

// 서재 — 내 유리병 목록(최대 7개, 날짜 내림차순)
export const getJars = () => api.get<JarsListResponse>("/api/jars").then((res) => res.data);

// 유리병 상세 — 본인 또는 친구만 조회 가능
export const getJar = (id: string) => api.get<Jar>(`/api/jars/${id}`).then((res) => res.data);

// 삭제하기 — 본인 소유 유리병만
export const deleteJar = (id: string) =>
  api.delete<{ ok: boolean }>(`/api/jars/${id}`).then((res) => res.data);

// 유리병 PNG — 서재·친구 탭 렌더용. 본인 또는 친구만. <img src>에 바로 사용
export const getJarImageUrl = (id: string) => `/api/jars/${id}/image`;
