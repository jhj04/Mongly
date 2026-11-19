"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/common/Button";
import GradientMaskedImage from "@/components/common/GradientMaskedImage";
import EmotionCompositionModal from "@/components/home/EmotionCompositionModal";
import EmotionGradientBlob from "@/components/home/EmotionGradientBlob";
import { useTodayJar } from "@/hooks/useJars";
import { buildEmotionMeshBlobs } from "@/lib/emotionMeshGradient";
import { useSound } from "@/hooks/useSound";
import { useIsDesktop } from "@/hooks/useIsDesktop";

// 그라디언트가 빠르게 여러 바퀴 돌며 색이 섞이는 "로딩" 연출 시간(ms).
// EmotionGradientBlob의 fast 스핀(0.5s * 3바퀴)과 길이를 맞춰서, 딱 한 바퀴 세트가
// 끝나는 시점에 캐릭터가 "짠" 하고 태어나듯 나타나게 함.
const REVEAL_DELAY_MS = 1500;

// 저장(POST /api/jars)은 이제 홈 화면의 한 줄 일기 모달에서 끝난 뒤에만 이 화면으로 옴.
// 그래서 여기는 순수 리빌 화면 — jar가 없으면(= draft만 있거나 아무것도 없으면) 홈으로 돌려보냄.
export default function JarResultPage() {
  const router = useRouter();
  const { jar, isLoading } = useTodayJar();
  const playIntroSound = useSound("/audios/0404-신비로운인트로.mp3", { volume: 0.5 });
  const isDesktop = useIsDesktop();

  const [showComposition, setShowComposition] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const introPlayedRef = useRef(false);

  useEffect(() => {
    // 아직 완성(저장)되지 않은 상태로 들어왔으면 홈으로 돌려보냄
    if (!isLoading && !jar) {
      router.replace("/home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, jar]);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // 정상 진입일 때만, 진입 순간(그라디언트 로딩 연출과 함께) 인트로음 재생.
  // ref 가드로 중복 재생(리렌더/StrictMode) 방지.
  useEffect(() => {
    if (isLoading || !jar || introPlayedRef.current) return;
    introPlayedRef.current = true;
    playIntroSound();
  }, [isLoading, jar, playIntroSound]);

  if (!jar) return null;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      {/* fixed + -z-10라서 헤더 뒤쪽까지 화면 전체를 덮음(<main> 박스 안에만 깔리면
          헤더 바로 아래에서 body 배경과 색이 끊겨 보임) */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-white/20">
        <EmotionGradientBlob emotions={jar.emotions} fast={!revealed} />
      </div>

      {revealed && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-8"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <GradientMaskedImage
            className="translate-y-3"
            src="/images/motions/monglytilt_sprite.png"
            frameWidth={640}
            frameHeight={640}
            frameCount={30}
            columns={6}
            blobs={buildEmotionMeshBlobs(jar.emotions)}
            alt="몽글리"
            width={isDesktop ? 520 : 360}
            height={isDesktop ? 520 : 360}
          />

          <p className="text-center font-point text-xl text-primary-900">
            오늘의 감정을 유리병에 담았어요!
          </p>

          <Button
            label="감정 구성 보기"
            variant="outlined"
            size="lg"
            onClick={() => setShowComposition(true)}
          />
        </motion.div>
      )}

      {showComposition && (
        <EmotionCompositionModal
          emotions={jar.emotions}
          dominantEmotionId={jar.dominantEmotionId}
          onClose={() => setShowComposition(false)}
        />
      )}
    </main>
  );
}
