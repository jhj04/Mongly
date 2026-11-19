"use client";

import { useEffect, useRef } from "react";
import type { EmotionMeshBlob } from "@/lib/emotionMeshGradient";

interface GradientMaskedImageProps {
  /** 프레임들을 격자로 늘어놓은 스프라이트 시트(투명 배경) URL */
  src: string;
  /** 스프라이트 한 칸의 크기 */
  frameWidth: number;
  frameHeight: number;
  /** 총 프레임 수 */
  frameCount: number;
  /** 스프라이트 시트의 열 수 */
  columns: number;
  /** 프레임당 재생 시간(ms) */
  frameDurationMs?: number;
  /** 실루엣 위에 입힐 색 블롭들 */
  blobs: EmotionMeshBlob[];
  alt: string;
  width: number;
  height: number;
  className?: string;
}

interface FitRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

// CanvasRenderingContext2D.drawImage()는 애니메이션 GIF/WebP를 그릴 때 항상 첫 프레임만
// 그린다(브라우저 공통 제약) — "살아있는 애니메이션 리소스의 현재 프레임을 훔쳐보는" 접근은
// 구조적으로 불가능함. 그래서 프레임 진행을 아예 우리 코드가 직접 제어한다: 프레임들을 미리
// 정적 스프라이트 시트로 구워두고, 매 rAF마다 performance.now() 기준으로 frameIndex를 계산해
// 그 칸만 잘라 그린다. 베이스 캐릭터와 색 마스크 모두 같은 frameIndex에서 나오므로
// 구조적으로 어긋날 수 없다.
export default function GradientMaskedImage({
  src,
  frameWidth,
  frameHeight,
  frameCount,
  columns,
  frameDurationMs = 100,
  blobs,
  alt,
  width,
  height,
  className = "",
}: GradientMaskedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const blobsRef = useRef(blobs);

  useEffect(() => {
    blobsRef.current = blobs;
  }, [blobs]);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    const offscreen = offscreenRef.current;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = offscreen.width = Math.round(width * dpr);
    canvas.height = offscreen.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    offCtx.scale(dpr, dpr);

    let rafId = 0;
    let cancelled = false;
    let startTime = 0;
    // object-contain과 동일한 배치 — 한 프레임 안의 모든 drawImage 호출이 이 값을 공유해야
    // 베이스와 색 마스크가 서로 어긋나지 않음
    const scale = Math.min(width / frameWidth, height / frameHeight);
    const dw = frameWidth * scale;
    const dh = frameHeight * scale;
    const fit: FitRect = { dx: (width - dw) / 2, dy: (height - dh) / 2, dw, dh };

    const paintBlobs = () => {
      offCtx.globalCompositeOperation = "source-over";
      offCtx.clearRect(0, 0, width, height);
      for (const blob of blobsRef.current) {
        const cx = (blob.xPct / 100) * width;
        const cy = (blob.yPct / 100) * height;
        const r = (blob.radiusPct / 100) * Math.max(width, height);
        const gradient = offCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, blob.colorHex);
        gradient.addColorStop(1, "transparent");
        offCtx.fillStyle = gradient;
        offCtx.fillRect(0, 0, width, height);
      }
    };

    const draw = (now: number) => {
      if (cancelled) return;
      if (!startTime) startTime = now;

      const frameIndex = Math.floor(((now - startTime) / frameDurationMs) % frameCount);
      const sx = (frameIndex % columns) * frameWidth;
      const sy = Math.floor(frameIndex / columns) * frameHeight;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, sx, sy, frameWidth, frameHeight, fit.dx, fit.dy, fit.dw, fit.dh);

      paintBlobs();
      offCtx.globalCompositeOperation = "destination-in";
      offCtx.drawImage(img, sx, sy, frameWidth, frameHeight, fit.dx, fit.dy, fit.dw, fit.dh);

      ctx.globalCompositeOperation = "color";
      ctx.drawImage(offscreen, 0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      rafId = requestAnimationFrame(draw);
    };

    const start = () => {
      rafId = requestAnimationFrame(draw);
    };

    const decodeThenStart = () => {
      if (img.decode) img.decode().then(start).catch(start);
      else start();
    };

    if (img.complete && img.naturalWidth > 0) {
      decodeThenStart();
    } else {
      img.onload = decodeThenStart;
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      img.onload = null;
    };
  }, [src, width, height, frameWidth, frameHeight, frameCount, columns, frameDurationMs]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- canvas가 매 프레임 참조할
          안정적인 HTMLImageElement ref/decode() 타이밍이 필요함. 실제로 화면에 그려지는 건
          아래 canvas뿐이라 opacity-0로 숨김(스프라이트는 정적 이미지라 display:none이어도
          무방하지만 일관되게 opacity만 사용) */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
      <canvas ref={canvasRef} role="img" aria-label={alt} className="absolute inset-0" />
    </div>
  );
}
