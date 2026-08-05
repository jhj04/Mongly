import { api } from "@/lib/axios";

export interface CheckLoginIdResponse {
  available: boolean;
}

// 분당 30회 제한 — 회원가입/닉네임 수정 화면에서 공용으로 사용
export const checkLoginId = (loginId: string) =>
  api
    .get<CheckLoginIdResponse>("/api/users/check-login-id", { params: { loginId } })
    .then((res) => res.data);

export interface UpdateLoginIdRequest {
  loginId: string;
}

export interface UpdateLoginIdResponse {
  loginId: string;
}

export const updateLoginId = (data: UpdateLoginIdRequest) =>
  api.patch<UpdateLoginIdResponse>("/api/users/me/login-id", data).then((res) => res.data);

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const updatePassword = (data: UpdatePasswordRequest) =>
  api.patch<{ ok: boolean }>("/api/users/me/password", data).then((res) => res.data);

export interface DeleteAccountRequest {
  password: string;
}

// 유리병·친구 관계까지 전부 삭제되는 파괴적인 작업
export const deleteAccount = (data: DeleteAccountRequest) =>
  api.delete<{ ok: boolean }>("/api/users/me", { data }).then((res) => res.data);
