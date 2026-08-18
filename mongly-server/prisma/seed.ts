import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 감정 10종 — 2026-08-17 프론트와 합의된 확정 목록 (id = 합의 문서의 나열 순서).
// colorHex는 피그마 팔레트에서 색 이름에 맞춰 재배정한 "기준색" — 최종 색 작업은 프론트 담당이므로
// 여기 값은 참고용. 이름/색이 바뀌면 이 파일 수정 후 `npm run db:seed` 재실행.
// 규칙: id = sortOrder = 1~10 (계획서 §4)
const EMOTIONS = [
  { id: 1, name: "기쁨", colorHex: "#FFD54A" }, // 노랑
  { id: 2, name: "슬픔", colorHex: "#4966B6" }, // 파랑 남색
  { id: 3, name: "분노", colorHex: "#F05B5B" }, // 빨강
  { id: 4, name: "놀람", colorHex: "#7ED9F8" }, // 하늘색
  { id: 5, name: "불안", colorHex: "#9B7AE5" }, // 보라
  { id: 6, name: "사랑", colorHex: "#FF78AE" }, // 핑크
  { id: 7, name: "짜증", colorHex: "#FF9D4D" }, // 주황
  { id: 8, name: "설렘", colorHex: "#FFD5E8" }, // 연한 핑크
  { id: 9, name: "후회", colorHex: "#A9B0B8" }, // 회색
  { id: 10, name: "희망", colorHex: "#B7E66B" }, // 연두
];

async function main() {
  // name이 @unique라서 이름을 id 간에 재배치하는 시드(예: 기쁨 id2→id1)는 단순 upsert가 P2002로 깨진다.
  // 기존 행 이름을 임시 이름으로 비켜 둔 뒤 확정 이름을 쓰는 2단계로, 어떤 기존 데이터 위에서도 재실행 가능하게 한다
  await prisma.$transaction(async (tx) => {
    for (const e of EMOTIONS) {
      await tx.emotion.updateMany({ where: { id: e.id }, data: { name: `__tmp_${e.id}` } });
    }
    for (const e of EMOTIONS) {
      await tx.emotion.upsert({
        where: { id: e.id },
        update: { name: e.name, colorHex: e.colorHex, sortOrder: e.id },
        create: { ...e, sortOrder: e.id, isActive: true },
      });
    }
  });
  console.log(`감정 마스터 ${EMOTIONS.length}종 시드 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
