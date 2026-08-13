"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mongly:localJars";
const PENDING_IMAGE_KEY = "mongly:pendingJarImage";

export interface LocalJar {
  id: string;
  recordDate: string; // YYYY-MM-DD
  image: string; // data URL
}

function readLocalJars(): LocalJar[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalJar[]) : [];
  } catch {
    return [];
  }
}

function todayRecordDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// 백엔드에 유리병 이미지 저장이 붙기 전까지 임시로 브라우저 localStorage에 캡처한 PNG를 보관.
// 나중에 API가 이미지를 내려주게 되면 이 훅은 통째로 걷어내면 됨.
export function useLocalJars() {
  const [jars, setJars] = useState<LocalJar[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJars(readLocalJars());
  }, []);

  const addLocalJar = useCallback((image: string) => {
    const jar: LocalJar = { id: `local-${Date.now()}`, recordDate: todayRecordDate(), image };
    setJars((prev) => {
      const next = [jar, ...prev];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { jars, addLocalJar };
}

// 완료하기 -> 결과 페이지로 넘어가는 동안 캡처한 이미지를 잠깐 들고 있는 용도(같은 탭 내에서만 필요).
export function setPendingJarImage(image: string) {
  window.sessionStorage.setItem(PENDING_IMAGE_KEY, image);
}

export function takePendingJarImage(): string | null {
  const image = window.sessionStorage.getItem(PENDING_IMAGE_KEY);
  if (image) window.sessionStorage.removeItem(PENDING_IMAGE_KEY);
  return image;
}
