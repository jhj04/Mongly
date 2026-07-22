"use client";

import Button from "@/components/Button";

export default function StudyPage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-center justify-center gap-128 px-6 pb-20 mt-auto">
        <Button label="삭제하기" variant="outlined" size="lg" onClick={() => console.log("삭제하기")} />
        <Button label="캐릭터 보기" variant="filled" size="lg" onClick={() => console.log("캐릭터 보기")} />
      </div>
    </main>
  );
}