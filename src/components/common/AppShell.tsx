"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import SnackbarProvider from "./SnackbarProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudy = pathname.startsWith("/study");
  const isFriends = pathname.startsWith("/friends");
  const isOnboarding = pathname === "/";

  return (
    <body
      className={`h-dvh flex flex-col bg-cover bg-no-repeat sm:bg-fixed ${
        isOnboarding
          ? "bg-[url('/images/login_screen.png')]"
          : isStudy || isFriends
          ? "bg-[url('/images/study_mobile_screen.png')] sm:bg-[url('/images/study_screen.png')]"
          : "bg-[url('/images/home_mobile_screen.png')] sm:bg-[url('/images/home_screen.png')]"
      }`}
      style={{
        backgroundPosition: isOnboarding
          ? "center calc(50% - 5rem)"
          : isStudy || isFriends
          ? "center calc(50%)"
          : "center calc(50%)",
      }}
    >
      <SnackbarProvider>
        {!isOnboarding && <Header />}
        {children}
      </SnackbarProvider>
    </body>
  );
}
