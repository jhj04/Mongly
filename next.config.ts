import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 백엔드(mongly-server) 프록시 — 쿠키를 first-party로 만들어 Safari에서도 로그인 유지 (백엔드 계획서 §7)
  // 로컬: http://localhost:4000, Vercel 배포: 환경변수 API_ORIGIN에 Render URL 설정
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
