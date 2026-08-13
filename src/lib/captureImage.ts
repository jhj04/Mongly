import { toPng } from "html-to-image";

// 배경 없이(투명) 지정한 DOM 노드만 PNG로 캡처 — 유리병+구슬처럼 특정 영역만 잘라서 저장할 때 사용
export function captureNodeAsPng(node: HTMLElement): Promise<string> {
  return toPng(node, { backgroundColor: undefined, pixelRatio: 2 });
}
