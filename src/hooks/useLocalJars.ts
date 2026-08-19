"use client";

const PENDING_IMAGE_KEY = "mongly:pendingJarImage";

// 완료하기 -> 결과 페이지로 넘어가는 동안 캡처한 이미지를 잠깐 들고 있는 용도(같은 탭 내에서만 필요).
export function setPendingJarImage(image: string) {
  window.sessionStorage.setItem(PENDING_IMAGE_KEY, image);
}

export function takePendingJarImage(): string | null {
  const image = window.sessionStorage.getItem(PENDING_IMAGE_KEY);
  if (image) window.sessionStorage.removeItem(PENDING_IMAGE_KEY);
  return image;
}
