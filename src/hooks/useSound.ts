import { useCallback, useEffect, useRef } from "react";

// 짧은 효과음/연출음을 재생하기 위한 훅.
// public 폴더의 오디오 경로를 받아 Audio 인스턴스를 하나 만들어두고,
// 반환된 play()를 호출하면 처음부터 다시 재생함.
// 파일명이 한글이라 브라우저가 확실히 인코딩하도록 encodeURI로 감쌈.
export function useSound(src: string, { volume = 1 }: { volume?: number } = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(encodeURI(src));
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src, volume]);

  // play()는 사용자 제스처(클릭/드롭) 안에서 호출돼야 브라우저 자동재생 정책에 안 막힘.
  // 이미 재생 중이면 처음으로 되감아 다시 재생.
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // 자동재생 차단 등으로 실패해도 조용히 무시(연출용이라 치명적이지 않음)
    });
  }, []);

  return play;
}
