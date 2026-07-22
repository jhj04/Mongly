"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { glassSurface } from "@/lib/styles";

const navItems = [
  { label: "몽글리", href: "/home" },
  { label: "서재", href: "/study" },
  { label: "친구", href: "/friends" },
  { label: "설정", href: "/settings" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="w-full flex justify-center px-6 pt-6">
      <nav
        className={`${glassSurface} flex w-full max-w-2xl items-center rounded-full px-2 py-2 bg-secondary/20`}
      >
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`relative z-10 flex-1 py-2 mx-5 text-center rounded-full text-md transition-all font-point ${
              pathname === item.href
                ? "bg-primary text-primary-900 font-bold shadow-drop"
                : "text-primary-900"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
