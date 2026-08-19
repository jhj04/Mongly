"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/common/Button";
import GradientMaskedImage from "@/components/common/GradientMaskedImage";
import EmotionGradientBlob from "@/components/home/EmotionGradientBlob";
import EmotionCompositionModal from "@/components/home/EmotionCompositionModal";
import { buildEmotionConicGradient } from "@/lib/emotionGradient";
import type { JarEmotionCount } from "@/lib/api/jars";

interface ShelfCharacterViewProps {
  /** 선택한 유리병에 담긴 감정 — 색 조합·감정 구성의 원천 */
  emotions: JarEmotionCount[];
  dominantEmotionId: number | null;
  /** "돌아가기" — 선반 화면으로 복귀 */
  onBack: () => void;
}

// 서재·친구 탭에서 "캐릭터 보기"를 누르면 선반 대신 뜨는 화면.
// AppShell의 방 배경·상단 네비는 그대로 두고 <main> 안쪽만 교체함.
// 결과(변환) 화면과 동일하게 병 색상 조합으로 몽글리에 색을 입혀서 보여줌.
export default function ShelfCharacterView({
  emotions,
  dominantEmotionId,
  onBack,
}: ShelfCharacterViewProps) {
  const [showComposition, setShowComposition] = useState(false);

  return (
    <>
      {/* 이 화면만 선반(study) 배경 대신 홈 배경을 씀 — AppShell의 body 배경 위에 덮어줌.
          클래스는 AppShell의 홈 분기와 동일하게 맞춤 */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-cover bg-no-repeat sm:bg-fixed bg-[url('/images/home_mobile_screen.png')] sm:bg-[url('/images/home_screen.png')]"
        style={{ backgroundPosition: "center calc(50%)" }}
      />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* 결과 화면과 같은 회전 그라데이션을 캐릭터 뒤에 은은하게 깔아줌 */}
        <div className="pointer-events-none absolute inset-0">
          <EmotionGradientBlob emotions={emotions} />
        </div>

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <GradientMaskedImage
            src="/images/characters/mongly_right.png"
            gradient={buildEmotionConicGradient(emotions)}
            alt="몽글리"
            width={320}
            height={320}
          />
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 pb-20 mt-auto">
        <Button
          label="감정 구성 보기"
          variant="outlined"
          size="lg"
          onClick={() => setShowComposition(true)}
        />
        <Button label="돌아가기" variant="filled" size="lg" onClick={onBack} />
      </div>

      {showComposition && (
        <EmotionCompositionModal
          emotions={emotions}
          dominantEmotionId={dominantEmotionId}
          onClose={() => setShowComposition(false)}
        />
      )}
    </>
  );
}
