"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import type { Emotion } from "@/lib/emotions";

export interface PhysicsBead {
  id: string;
  emotion: Emotion;
  radius: number;
}

interface UseJarPhysicsOptions {
  max?: number;
}

// Matter.js는 중력/충돌 계산에만 쓰고 자체 캔버스 렌더러는 쓰지 않음.
// containerRef(유리병 내부 영역)의 실제 렌더 크기를 기준으로 보이지 않는 벽을 세우고,
// 매 물리 틱마다 각 구슬 DOM 엘리먼트의 transform을 직접 갱신해서(React 리렌더 없이) 위치를 반영함.
// 컨테이너 크기가 바뀌어도(반응형 리사이즈) 벽은 마운트 시점 크기로 고정됨.
export function useJarPhysics(
  containerRef: React.RefObject<HTMLDivElement | null>,
  { max = 10 }: UseJarPhysicsOptions = {}
) {
  const [beads, setBeads] = useState<PhysicsBead[]>([]);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
    engineRef.current = engine;

    const wallOptions = { isStatic: true, restitution: 0.25, friction: 0.5 };
    const thickness = 30;

    const floor = Matter.Bodies.rectangle(
      width / 2,
      height + thickness / 2,
      width,
      thickness,
      wallOptions
    );
    const leftWall = Matter.Bodies.rectangle(
      -thickness / 2,
      height / 2,
      thickness,
      height * 1.5,
      wallOptions
    );
    const rightWall = Matter.Bodies.rectangle(
      width + thickness / 2,
      height / 2,
      thickness,
      height * 1.5,
      wallOptions
    );

    Matter.Composite.add(engine.world, [floor, leftWall, rightWall]);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    const syncPositions = () => {
      bodiesRef.current.forEach((body, id) => {
        const el = elementsRef.current.get(id);
        if (!el) return;
        const radius = body.circleRadius ?? 0;
        el.style.transform = `translate(${body.position.x - radius}px, ${
          body.position.y - radius
        }px) rotate(${body.angle}rad)`;
      });
    };
    Matter.Events.on(engine, "afterUpdate", syncPositions);

    const bodies = bodiesRef.current;
    const elements = elementsRef.current;
    return () => {
      Matter.Events.off(engine, "afterUpdate", syncPositions);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      bodies.clear();
      elements.clear();
    };
  }, [containerRef]);

  const registerBeadEl = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) elementsRef.current.set(id, el);
    else elementsRef.current.delete(id);
  }, []);

  const dropBead = useCallback(
    (emotion: Emotion, id: string) => {
      const container = containerRef.current;
      const engine = engineRef.current;
      if (!container || !engine) return;

      const { width } = container.getBoundingClientRect();
      const radius = Math.max(20, width * 0.2);
      const x = width / 2 + (Math.random() * width * 0.1 - width * 0.05);

      const body = Matter.Bodies.circle(x, radius, radius, {
        restitution: 0.5,
        friction: 0.15,
        density: 0.0025,
      });

      bodiesRef.current.set(id, body);
      Matter.Composite.add(engine.world, body);
      setBeads((prev) => [...prev, { id, emotion, radius }]);
    },
    [containerRef]
  );

  const removeBead = useCallback(() => {
    setBeads((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const engine = engineRef.current;
      const body = bodiesRef.current.get(last.id);
      if (engine && body) Matter.Composite.remove(engine.world, body);
      bodiesRef.current.delete(last.id);
      elementsRef.current.delete(last.id);
      return prev.slice(0, -1);
    });
  }, []);

  const clearBeads = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      bodiesRef.current.forEach((body) => Matter.Composite.remove(engine.world, body));
    }
    bodiesRef.current.clear();
    elementsRef.current.clear();
    setBeads([]);
  }, []);

  return {
    beads,
    count: beads.length,
    max,
    isFull: beads.length >= max,
    registerBeadEl,
    dropBead,
    removeBead,
    clearBeads,
  };
}
