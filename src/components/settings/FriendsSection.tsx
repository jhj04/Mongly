"use client";

import { useState } from "react";
import Button from "@/components/Button";
import CircleCheckbox from "@/components/CircleCheckbox";
import { DUMMY_FRIENDS } from "@/data/dummy";

export default function FriendsSection() {
  const [selected, setSelected] = useState<number[]>([]);

  const toggleFriend = (idx: number) => {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <section className="flex flex-col gap-4 p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-point text-xl text-primary-800">친구</h2>
        <span className="font-point text-primary-900">{DUMMY_FRIENDS.length}/10</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {DUMMY_FRIENDS.map((name, idx) => (
          <CircleCheckbox
            key={idx}
            label={name}
            checked={selected.includes(idx)}
            onChange={() => toggleFriend(idx)}
          />
        ))}
      </div>

      <div className="flex gap-3 mt-2">
        <Button
          label="취소하기"
          variant="outlined"
          className="flex-1"
          onClick={() => setSelected([])}
        />
        <Button
          label={`${selected.length}명 삭제하기`}
          variant="danger"
          className="flex-1"
          onClick={() => {}}
        />
      </div>
    </section>
  );
}
