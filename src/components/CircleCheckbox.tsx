"use client";

interface CircleCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function CircleCheckbox({
  label,
  checked,
  onChange,
}: CircleCheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className="relative flex-shrink-0 w-5 h-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 opacity-0 cursor-pointer"
        />
        <span className="absolute inset-0 rounded-full border-2 border-taupe-300 peer-checked:border-brown-600 transition-colors" />
        <span className="absolute inset-1 rounded-full bg-brown-600 scale-0 peer-checked:scale-100 transition-transform" />
      </span>
      <span className="font-point text-sm text-primary-900 truncate">{label}</span>
    </label>
  );
}
