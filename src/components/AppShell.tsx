"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudy = pathname.startsWith("/study");
  const isFriends = pathname.startsWith("/friends");
  const isOnboarding = pathname === "/";

  return (
    <body
      className={`min-h-dvh flex flex-col bg-cover ${
        isStudy || isFriends
          ? "bg-[url('/images/study_screen.png')]"
          : "bg-[url('/images/home_screen.png')]"
      }`}
      style={{ backgroundPosition: "center calc(50% - 3rem)" }}
    >
      {!isOnboarding && <Header />}
      {children}
    </body>
  );
}
