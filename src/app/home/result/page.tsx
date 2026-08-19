"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/common/Button";
import GradientMaskedImage from "@/components/common/GradientMaskedImage";
import EmotionCompositionModal from "@/components/home/EmotionCompositionModal";
import EmotionGradientBlob from "@/components/home/EmotionGradientBlob";
import { useTodayJar, useCompleteJar } from "@/hooks/useJars";
import { useSnackbar } from "@/components/common/SnackbarProvider";
import { takePendingJarImage } from "@/hooks/useLocalJars";
import { buildEmotionConicGradient } from "@/lib/emotionGradient";

// 그라디언트가 빠르게 여러 바퀴 돌며 색이 섞이는 "로딩" 연출 시간(ms).
// EmotionGradientBlob의 fast 스핀(0.5s * 3바퀴)과 길이를 맞춰서, 딱 한 바퀴 세트가
// 끝나는 시점에 캐릭터가 "짠" 하고 태어나듯 나타나게 함.
const REVEAL_DELAY_MS = 1500;

// 완료하기를 누르면 여기로만 이동함 — 실제 서재 저장(POST /api/jars)은
// "저장하기"를 눌렀을 때 일어남. 감정은 홈 화면에서 담는 즉시 서버에 저장돼 있어서
// (드래프트), 여기서는 오늘 상태를 다시 조회해서 보여주기만 하면 됨.
export default function JarResultPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { jar, draft, isLoading } = useTodayJar();
  const { completeJar, isLoading: isSaving } = useCompleteJar();

  const [showComposition, setShowComposition] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const source = jar ?? draft;
  const alreadySaved = !!jar;

  useEffect(() => {
    // 담은 감정이 하나도 없는 상태로 들어왔으면 홈으로 돌려보냄
    if (!isLoading && !source) {
      router.replace("/home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, source]);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    const image = takePendingJarImage();
    if (!image) {
      showSnackbar("유리병 이미지를 불러오지 못했어요. 다시 시도해주세요.");
      return;
    }
    const { error } = await completeJar({ image });
    if (error) {
      showSnackbar(error.message);
      return;
    }
    showSnackbar("서재에 저장했어요!");
    setSaved(true);
  };

  if (!source) return null;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      {/* fixed + -z-10라서 헤더 뒤쪽까지 화면 전체를 덮음(<main> 박스 안에만 깔리면
          헤더 바로 아래에서 body 배경과 색이 끊겨 보임) */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-white/20">
        <EmotionGradientBlob emotions={source.emotions} fast={!revealed} />
      </div>

      {revealed && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-8"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <GradientMaskedImage
            src="/images/characters/mongly_right.png"
            gradient={buildEmotionConicGradient(source.emotions)}
            alt="몽글리"
            width={360}
            height={360}
          />

          <p className="text-center font-point text-xl text-primary-900">
            오늘의 감정을 유리병에 담았어요!
          </p>

          <div className="flex gap-3">
            <Button
              label="감정 구성 보기"
              variant="outlined"
              size="lg"
              onClick={() => setShowComposition(true)}
            />
            <Button
              label={alreadySaved || saved ? "저장 완료" : "저장하기"}
              variant="filled"
              size="lg"
              onClick={handleSave}
              disabled={alreadySaved || saved || isSaving}
            />
          </div>
        </motion.div>
      )}

      {showComposition && (
        <EmotionCompositionModal
          emotions={source.emotions}
          dominantEmotionId={source.dominantEmotionId}
          onClose={() => setShowComposition(false)}
        />
      )}
    </main>
  );
}
