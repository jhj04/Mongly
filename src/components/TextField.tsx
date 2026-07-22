"use client";

import { useState } from "react";
import { PiEyeLight, PiEyeClosedLight } from "react-icons/pi";

interface TextFieldProps {
  label: string;
  type?: "text" | "password" | "email";
  value?: string;
  onChange?: (value: string) => void;
  helperText?: string;
}

export default function TextField({
  label,
  type = "text",
  value,
  onChange,
  helperText,
}: TextFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center px-5 py-2 rounded-full gap-1 bg-secondary/80 shadow-drop">
        <input
          type={inputType}
          placeholder={label}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 bg-transparent outline-none font-sans text-base text-primary-900 placeholder-accent"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex-shrink-0 text-accent"
          >
            {visible ? <PiEyeLight size={22} /> : <PiEyeClosedLight size={22} />}
          </button>
        )}
      </div>
      {helperText && (
        <span className="text-xs text-accent px-2">{helperText}</span>
      )}
    </div>
  );
}
