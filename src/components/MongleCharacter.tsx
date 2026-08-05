"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Emotion } from "@/lib/emotions";

interface MongleCharacterProps {
  /** true가 되면 등장 + 이동 애니메이션 재생 */
  active: boolean;
  /** 현재 들고 있는 구슬 감정 (없으면 렌더 안 함) */
  ballEmotion: Emotion | null;
  /** 병 위에서 구슬을 놓아 병 속으로 들어가는 시점 호출 */
  onDropComplete: () => void;
}

// 캐릭터가 올라가는 데 걸리는 시간 (커질수록 더 느리게 떠오름)
const RISE_DURATION = 2.0;
// 캐릭터가 (내려가지 않고) 다시 날아나가는 데 걸리는 시간
const EXIT_DURATION = 1.7;
// 구슬이 손을 떠나 떨어지는 데 걸리는 시간
const DROP_DURATION = 0.45;

// 왼쪽 아래 훨씬 먼 곳에서 등장해 포물선을 그리며 위로 떠오른 뒤,
// (내려오지 않고) 그 자리에서 날갯짓하며 구슬을 짧게 떨어뜨려(부딪히듯 통통 튀는 모션) 병 속으로 넣고,
// 올라왔던 곡선을 거슬러 다시 왼쪽 아래로 날아나가는 요정 같은 모션.
export default function MongleCharacter({
  active,
  ballEmotion,
  onDropComplete,
}: MongleCharacterProps) {
  return (
    <AnimatePresence>
      {active && ballEmotion && (
        <motion.div
          key="mongle-character"
          className="pointer-events-none absolute left-[62%] top-[8%] z-40 -translate-x-1/2 -translate-y-1/2"
          initial={{ x: "-220%", y: "210%", opacity: 0, scale: 0.6 }}
          animate={{
            x: ["-220%", "-100%"],
            y: ["210%", "-50%"],
            opacity: [0, 1],
            scale: [0.6, 1],
            // 원래는 여기서 "0%"까지 한 번 더 내려와 병 옆에 안착했는데,
            // 내려오지 않고 떠오른 상태 그대로 있도록 그 구간은 뺐음
          }}
          exit={{
            x: "-220%",
            y: "210%",
            opacity: 0,
            scale: 0.6,
            transition: { duration: EXIT_DURATION, ease: "easeIn" },
          }}
          transition={{ duration: RISE_DURATION, ease: "easeOut" }}
        >
          {/* 도착 후 날갯짓하듯 미세하게 위아래로 떠 있는 호버링 */}
          <motion.div
            className="relative"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: RISE_DURATION }}
          >
            <Image
              src="/images/characters/mongly_right.png"
              alt="몽글리"
              width={220}
              height={220}
              priority
            />

            {/* 품에 안은 구슬: 도착 후 짧게 떨어지다 유리에 부딪힌 듯 눌렸다 튕기며 사라짐 */}
            <motion.div
              className="absolute h-12 w-12"
              style={{ left: "62%", top: "50%" }}
              initial={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
              animate={{
                y: [0, 26, 30, 28],
                scaleX: [1, 1, 1.3, 1],
                scaleY: [1, 1, 0.65, 0.9],
                opacity: [1, 1, 1, 0],
              }}
              transition={{
                duration: DROP_DURATION,
                delay: RISE_DURATION,
                times: [0, 0.7, 0.85, 1],
                ease: "easeIn",
              }}
              onAnimationComplete={onDropComplete}
            >
              <Image
                src={ballEmotion.image}
                alt={ballEmotion.label}
                fill
                sizes="48px"
                className="drop-shadow"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
