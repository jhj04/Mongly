import { api } from "@/lib/axios";

export interface AuthUser {
  email: string;
  loginId: string;
}

export interface SignupRequest {
  email: string;
  loginId: string;
  password: string;
  termsAgreed: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 — 성공 시 자동 로그인(쿠키 발급)
export const signup = (data: SignupRequest) =>
  api.post<AuthUser>("/api/auth/signup", data).then((res) => res.data);

export const login = (data: LoginRequest) =>
  api.post<AuthUser>("/api/auth/login", data).then((res) => res.data);

export const logout = () =>
  api.post<{ ok: boolean }>("/api/auth/logout").then((res) => res.data);

// 앱 부팅 시 세션 확인용
export const getMe = () =>
  api.get<AuthUser>("/api/auth/me").then((res) => res.data);
