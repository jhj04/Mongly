"use client";

import Button from "@/components/common/Button";
import FriendsShelf from "@/components/friends/FriendsShelf";

export default function FriendsPage() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <FriendsShelf />

      <div className="flex items-center justify-center gap-128 px-6 pb-20 mt-auto">
        <Button label="삭제하기" variant="outlined" size="lg" onClick={() => console.log("삭제하기")} />
        <Button label="캐릭터 보기" variant="filled" size="lg" onClick={() => console.log("캐릭터 보기")} />
      </div>
    </main>
  );
}