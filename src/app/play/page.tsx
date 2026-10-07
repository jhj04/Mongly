"use client";

import Image from "next/image";

export default function PlayPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-hidden">
      <Image
        src="/images/motions/monglyrunright.webp"
        alt="몽글리"
        width={220}
        height={220}
        unoptimized
      />
    </main>
  );
}
