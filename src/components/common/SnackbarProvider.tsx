"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Snackbar from "./Snackbar";

interface SnackbarContextValue {
  showSnackbar: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const DISPLAY_MS = 2500;

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar는 SnackbarProvider 안에서만 사용할 수 있어요.");
  return ctx;
}

export default function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), DISPLAY_MS);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {message && <Snackbar message={message} />}
    </SnackbarContext.Provider>
  );
}
