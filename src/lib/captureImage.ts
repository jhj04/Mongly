import { toPng } from "html-to-image";

// 캡처 기능을 잠시 꺼둔 동안(서재/친구 탭이 StaticJar로 렌더해서 캡처 PNG를 아무 데도
// 안 쓰는 상태) "저장하기"가 요구하는 image 필드를 채우기 위한 1x1 투명 PNG.
export const PLACEHOLDER_JAR_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// 노드 안의 모든 <img>가 로드/디코드를 끝낼 때까지 기다림.
// html-to-image는 캡처 시 DOM을 복제하며 각 이미지를 data URI로 인라인하는데,
// 아직 안 불러와진 이미지는 그냥 건너뛴다. 구슬을 연속으로 빠르게 담고 바로 캡처하면
// 방금 추가된 구슬(또는 유리병 자체)이 로드 전이라 "빈 병"으로 저장되는 걸 막기 위함.
async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (!(img.complete && img.naturalWidth > 0)) {
          await new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        }
        await img.decode();
      } catch {
        // 디코드 실패(cross-origin 등)는 무시하고 계속 진행
      }
    })
  );
}

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// 배경 없이(투명) 지정한 DOM 노드만 PNG로 캡처 — 유리병+구슬처럼 특정 영역만 잘라서 저장할 때 사용.
export async function captureNodeAsPng(node: HTMLElement): Promise<string> {
  const options = { backgroundColor: undefined, pixelRatio: 2 } as const;

  // 1) 이미지 로드 완료 대기 + 2) 등장/물리 애니메이션이 한 프레임 정착하도록 대기
  await waitForImages(node);
  await nextFrame();

  // 3) 첫 호출은 폰트/이미지 캐시를 데우는 용도라 비거나 깨진 결과가 나올 수 있어 버림.
  //    두 번째 호출이 안정적으로 완성된 결과를 냄(html-to-image의 알려진 이슈 회피).
  await toPng(node, options);
  return toPng(node, options);
}
