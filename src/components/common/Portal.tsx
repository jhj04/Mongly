"use client";

import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
}

// backdrop-filter(backdrop-blur 등)가 걸린 조상 안에서 렌더링되면 CSS 스펙상
// position:fixed 자식의 기준점이 뷰포트가 아니라 그 조상 박스로 바뀌어버림.
// 모달처럼 항상 화면 전체 기준으로 떠야 하는 요소는 document.body로 포탈시켜서 이 문제를 피함.
export default function Portal({ children }: PortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
