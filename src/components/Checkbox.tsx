"use client";

import { PiCheckBold } from "react-icons/pi";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="relative flex-shrink-0 w-5 h-5 rounded-md bg-secondary/80 shadow-drop-sm flex items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 opacity-0 cursor-pointer"
        />
        <PiCheckBold
          size={14}
          className={`text-primary-800 transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}
        />
      </span>
      <span className="font-sans text-[15px] font-regular text-black/25">{label}</span>
    </label>
  );
}
