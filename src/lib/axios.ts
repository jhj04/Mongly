import axios, { AxiosError } from "axios";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  };
}

// 서버 에러 응답({ error: {...} })을 던지기 쉬운 형태로 정규화한 에러
export class ApiError extends Error {
  code: string;
  status?: number;
  details?: ApiErrorBody["details"];

  constructor(body: ApiErrorBody, status?: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

// next.config.ts의 rewrites()가 /api/* 요청을 백엔드로 프록시하므로
// 브라우저 기준으로는 same-origin 요청이 되어 baseURL/withCredentials가 필요 없음
export const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: ApiErrorBody }>) => {
    const body = error.response?.data?.error;
    if (body) {
      return Promise.reject(new ApiError(body, error.response?.status));
    }
    return Promise.reject(error);
  }
);
