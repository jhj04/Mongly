import Image from "next/image";

interface GradientMaskedImageProps {
  /** 원본 이미지(투명 배경). 눈코입 등 디테일은 이 원본 그대로 유지됨 */
  src: string;
  /** 실루엣 위에 입힐 CSS background 값(그라데이션 등) */
  gradient: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

// 원본 이미지는 그대로 두고, 그 위에 같은 실루엣으로 마스킹한 그라데이션 레이어를
// mix-blend-mode: color로 얹음 — 그라데이션의 색상(Hue/Saturation)만 입혀지고
// 원본의 명암(눈코입 등 디테일)은 밝기(Luminosity)로 그대로 살아있음.
// (순수 mask-image만 쓰면 알파만 남아 디테일이 다 사라져서 이 방식을 씀)
export default function GradientMaskedImage({
  src,
  gradient,
  alt,
  width,
  height,
  className = "",
}: GradientMaskedImageProps) {
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image src={src} alt={alt} fill sizes={`${width}px`} className="object-contain" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: gradient,
          mixBlendMode: "color",
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </div>
  );
}
