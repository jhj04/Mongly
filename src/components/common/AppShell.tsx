"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import SnackbarProvider from "./SnackbarProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudy = pathname.startsWith("/study");
  const isFriends = pathname.startsWith("/friends");
  const isOnboarding = pathname === "/";

  // 앱 전체 배경음악 — AppShell은 라우트 이동에도 리마운트되지 않아 탭을 넘나들어도 끊기지 않음.
  // 효과음들(0.5)보다 옅게. 브라우저 자동재생 정책으로 마운트 시 재생이 막히면, 사용자가
  // 아무데나 처음 클릭하는 순간 한 번만 다시 시도해서 그 제스처로 재생을 틔움.
  useEffect(() => {
    const audio = new Audio("/audios/background_music.mp3");
    audio.loop = true;
    audio.volume = 0.05;
    audio.playbackRate = 0.75;
    audio.play().catch(() => {
      // 자동재생 차단이면 조용히 무시하고 첫 클릭에서 재시도
    });

    const resumeOnFirstClick = () => {
      audio.play().catch(() => {});
      document.removeEventListener("click", resumeOnFirstClick);
    };
    document.addEventListener("click", resumeOnFirstClick);

    return () => {
      audio.pause();
      document.removeEventListener("click", resumeOnFirstClick);
    };
  }, []);

  return (
    <body
      className={`h-dvh overflow-hidden flex flex-col bg-cover bg-no-repeat sm:bg-fixed ${
        isOnboarding
          ? "bg-[url('/images/login_mobile_screen.png')] sm:bg-[url('/images/login_screen.png')]"
          : isStudy || isFriends
          ? "bg-[url('/images/study_mobile_screen.png')] sm:bg-[url('/images/study_screen.png')]"
          : "bg-[url('/images/home_mobile_screen.png')] sm:bg-[url('/images/home_screen.png')]"
      }`}
      style={{
        backgroundPosition: "center calc(50%)",
      }}
    >
      <SnackbarProvider>
        {!isOnboarding && <Header />}
        {children}
      </SnackbarProvider>
    </body>
  );
}
