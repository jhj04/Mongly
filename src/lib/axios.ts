import axios, { AxiosError } from "axios";

export interface ApiErrorBody {
  code: string;
  message: string;
  // 엔드포인트마다 details 모양이 달라서(폼 에러, JAR_LIMIT의 details.jars 등) 느슨하게 두고
  // 각 호출부에서 필요한 모양으로 캐스팅해서 씀
  details?: Record<string, unknown>;
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
