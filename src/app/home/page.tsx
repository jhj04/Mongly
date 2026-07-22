"use client";

import { useState } from "react";
import Button from "@/components/Button";
import ColorPicker from "@/components/ColorPicker";

export default function Home() {
  const [color, setColor] = useState<string>("");

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-center justify-center gap-4 px-6 pb-20 mt-auto">
        <Button label="되돌리기" variant="outlined" size="lg" onClick={() => console.log("되돌리기")} />
        <ColorPicker selected={color} onSelect={setColor} />
        <Button label="완료하기" variant="filled" size="lg" onClick={() => console.log("완료하기")} />
      </div>
    </main>
  );
}
