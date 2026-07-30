import React from "react";
import { glassSurface, glassSolid } from "@/lib/styles";

type ButtonVariant = "filled" | "outlined" | "danger";
type ButtonSize = "lg" | "md" | "sm";

interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}

export default function Button({
  label,
  onClick,
  variant = "filled",
  size = "md",
  className = "",
  disabled = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-[2rem] font-point whitespace-nowrap transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const sizes: Record<ButtonSize, string> = {
    lg: "px-[clamp(1rem,4vw,2.5rem)] py-[clamp(0.75rem,2vw,1.25rem)] text-[clamp(0.875rem,1.6vw,1.25rem)]",
    md: "px-[clamp(1rem,2.5vw,1.25rem)] py-[clamp(0.5rem,1.2vw,0.75rem)] text-[clamp(0.875rem,1.4vw,1.125rem)]",
    sm: "px-5 py-2 text-sm",
  };

  const styles: Record<ButtonVariant, string> = {
    filled: `${glassSolid} bg-primary-800/80 text-white`,
    outlined: `${glassSurface} bg-secondary/10 text-primary-900`,
    danger: `${glassSolid} bg-danger/75 text-white`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
    >
      <span className="relative z-10 leading-none">{label}</span>
    </button>
  );
}
