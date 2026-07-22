"use client";

import { glassSurface } from "@/lib/styles";

interface ColorPickerProps {
  colors?: string[];
  selected?: string;
  onSelect?: (color: string) => void;
}

const DEFAULT_COLORS = [
  "#F05B5B",
  "#FF9D4D",
  "#FFD54A",
  "#B7E66B",
  "#7ED9F8",
  "#4966B6",
  "#9B7AE5",
  "#FF78AE",
  "#FFD5E8",
  "#A9B0B8",
];

export default function ColorPicker({
  colors = DEFAULT_COLORS,
  selected,
  onSelect,
}: ColorPickerProps) {
  return (
    <div className={`${glassSurface} rounded-[2rem] bg-white/10`}>
      <div className="relative z-10 w-[236px] sm:w-auto overflow-x-auto sm:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-3 px-5 py-3 w-max">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onSelect?.(color)}
              className="w-10 h-10 rounded-full transition-all active:scale-95 flex-shrink-0"
              style={{
                backgroundColor: color,
                outline: selected === color ? `3px solid ${color}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
