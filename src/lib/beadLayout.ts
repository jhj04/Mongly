import Matter from "matter-js";
import { findEmotionByEmotionId, type Emotion } from "@/lib/emotions";
import type { JarEmotionCount } from "@/lib/api/jars";

export interface BeadLayoutItem {
  id: string;
  emotion: Emotion;
  /** 유리병 내부 영역 기준 중심 좌표(0~1) */
  cx: number;
  cy: number;
  /** 내부 영역 너비 대비 반지름 비율 */
  r: number;
}

// 유리병 내부 좌표계 기준값 — Jar.tsx의 interior 박스 비율(가로 43%, 세로 70%)과
// 홈 물리(useJarPhysics: 반지름 = 내부 너비의 20%, 최대 7개)를 그대로 맞춤.
const REF_W = 100;
const REF_H = 163; // 100 * (0.70 / 0.43)
const RADIUS = REF_W * 0.2;
const MAX_BEADS = 7;
const SETTLE_STEPS = 300; // 300 * 16.67ms ≈ 5s 시뮬 — 7개면 충분히 정착
const STEP_MS = 1000 / 60;

// id 문자열 → 0~1 결정적 난수(같은 유리병이면 항상 같은 배치가 나오도록 seed 고정)
function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// 감정 카운트 목록을 유리병 내부에 쌓았을 때의 최종 좌표를 계산.
// 홈과 동일한 Matter.js 중력/충돌을 적용하되, 애니메이션 없이 동기적으로 수렴시켜
// 최종 위치만 뽑아낸다 — 선반을 화살표로 넘겨도 구슬이 튀지 않게 정지 상태로 그리기 위함.
export function computeBeadLayout(
  emotions: JarEmotionCount[],
  seedKey = ""
): BeadLayoutItem[] {
  // 감정별 count만큼 구슬로 펼침(최대 7개)
  const beads: { id: string; emotion: Emotion }[] = [];
  for (const e of emotions) {
    const emotion = findEmotionByEmotionId(e.emotionId);
    if (!emotion) continue;
    for (let i = 0; i < e.count && beads.length < MAX_BEADS; i++) {
      beads.push({ id: `${seedKey}-${e.emotionId}-${i}`, emotion });
    }
    if (beads.length >= MAX_BEADS) break;
  }
  if (beads.length === 0) return [];

  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
  const wallOptions = { isStatic: true, restitution: 0.25, friction: 0.5 };
  const thickness = 30;
  const floor = Matter.Bodies.rectangle(
    REF_W / 2,
    REF_H + thickness / 2,
    REF_W,
    thickness,
    wallOptions
  );
  const leftWall = Matter.Bodies.rectangle(
    -thickness / 2,
    REF_H / 2,
    thickness,
    REF_H * 1.5,
    wallOptions
  );
  const rightWall = Matter.Bodies.rectangle(
    REF_W + thickness / 2,
    REF_H / 2,
    thickness,
    REF_H * 1.5,
    wallOptions
  );
  Matter.Composite.add(engine.world, [floor, leftWall, rightWall]);

  const bodies = beads.map((b, i) => {
    // 좌우로 살짝 흩뿌리고, 위에서부터 층층이 떨어지도록 시작 높이를 stagger
    const jitter = seededUnit(b.id) - 0.5; // -0.5 ~ 0.5
    const x = REF_W / 2 + jitter * REF_W * 0.3;
    const y = -RADIUS - i * RADIUS * 2.1;
    return Matter.Bodies.circle(x, y, RADIUS, {
      restitution: 0.4,
      friction: 0.15,
      density: 0.0025,
    });
  });
  Matter.Composite.add(engine.world, bodies);

  for (let s = 0; s < SETTLE_STEPS; s++) {
    Matter.Engine.update(engine, STEP_MS);
  }

  const layout: BeadLayoutItem[] = beads.map((b, i) => ({
    id: b.id,
    emotion: b.emotion,
    cx: bodies[i].position.x / REF_W,
    cy: bodies[i].position.y / REF_H,
    r: RADIUS / REF_W,
  }));

  Matter.Engine.clear(engine);
  return layout;
}
