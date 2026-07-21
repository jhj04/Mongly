import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 색상은 피그마 확정 팔레트(메인 프레임 25:2)에서 추출한 정확한 값.
// 이름은 잠정(★) — 디자인 확정 시 이 파일만 수정 후 `npm run db:seed` 재실행 (upsert라 안전).
// 규칙: id = sortOrder = 1~10 (계획서 §4)
const EMOTIONS = [
  { id: 1, name: "분노", colorHex: "#F05B5B" }, // 감정 구성 모달에서 확인됨
  { id: 2, name: "기쁨", colorHex: "#FF9D4D" }, // ★
  { id: 3, name: "행복", colorHex: "#FFD54A" }, // ★
  { id: 4, name: "희망", colorHex: "#B7E66B" }, // 감정 구성 모달에서 확인됨
  { id: 5, name: "평온", colorHex: "#7ED9F8" }, // ★
  { id: 6, name: "슬픔", colorHex: "#4966B6" }, // 감정 구성 모달에서 확인됨
  { id: 7, name: "불안", colorHex: "#9B7AE5" }, // ★
  { id: 8, name: "사랑", colorHex: "#FF78AE" }, // ★
  { id: 9, name: "설렘", colorHex: "#FFD5E8" }, // 감정 구성 모달에서 확인됨
  { id: 10, name: "무덤덤", colorHex: "#A9B0B8" }, // ★
];

async function main() {
  for (const e of EMOTIONS) {
    await prisma.emotion.upsert({
      where: { id: e.id },
      update: { name: e.name, colorHex: e.colorHex, sortOrder: e.id },
      create: { ...e, sortOrder: e.id, isActive: true },
    });
  }
  console.log(`감정 마스터 ${EMOTIONS.length}종 시드 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
