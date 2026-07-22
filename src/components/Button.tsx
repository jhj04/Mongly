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
}

export default function Button({
  label,
  onClick,
  variant = "filled",
  size = "md",
  className = "",
}: ButtonProps) {
  const base = "rounded-[2rem] font-point whitespace-nowrap transition-all active:scale-95";

  const sizes: Record<ButtonSize, string> = {
    lg: "px-4 py-3 sm:px-10 sm:py-5 text-sm sm:text-xl",
    md: "px-4 py-3 sm:px-5 sm:py-2 text-sm sm:text-lg",
    sm: "px-5 py-2 text-sm",
  };

  const styles: Record<ButtonVariant, string> = {
    filled: `${glassSolid} bg-primary-800/80 text-white`,
    outlined: `${glassSurface} bg-secondary/10 text-primary-900`,
    danger: `${glassSolid} bg-danger/75 text-white`,
  };

  return (
    <button onClick={onClick} className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}>
      <span className="relative z-10">{label}</span>
    </button>
  );
}
