"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { glassSurface } from "@/lib/styles";
import { useSound } from "@/hooks/useSound";
import NotificationBell from "./NotificationBell";

const navItems = [
  { label: "몽글리", href: "/home" },
  { label: "서재", href: "/study" },
  { label: "놀이", href: "/play" },
  { label: "친구", href: "/friends" },
  { label: "설정", href: "/settings" },
];

export default function Header() {
  const pathname = usePathname();
  const playClickSound = useSound("/audios/click_sound.mp3", { volume: 0.5 });

  return (
    <header className="w-full flex items-center justify-center gap-3 px-6 pt-6 sm:-translate-x-6">
      <Link href="/home" className="hidden flex-shrink-0 sm:block">
        <Image src="/images/web_logo.png" alt="몽글리" width={120} height={54} className="h-15 w-auto" priority />
      </Link>

      <nav
        className={`${glassSurface} flex flex-1 max-w-2xl items-center rounded-full px-2 py-2 bg-secondary/20`}
      >
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={playClickSound}
            className={`relative z-10 flex-1 py-2 mx-2 sm:mx-5 text-center rounded-full text-md transition-all font-point ${
              pathname === item.href
                ? "bg-primary text-primary-900 text-lg shadow-drop"
                : "text-primary-900 text-lg"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <NotificationBell />
    </header>
  );
}
