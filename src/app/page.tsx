"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextField from "@/components/TextField";
import Button from "@/components/Button";

type Mode = "login" | "signup";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleLogin = () => {
    router.push("/home");
  };

  const handleSignup = () => {
    setMode("login");
  };

  return (
    <main className="flex flex-1 flex-col items-end justify-center pl-6 pr-[16%]">
      <div
        className="w-full max-w-md flex flex-col items-center gap-20 px-8 py-10 rounded-[2rem]"
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(20px)",
          boxShadow: "2px 2px 8px rgba(184, 110, 67, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        <h1 className="font-point text-2xl text-primary-900">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>

        <div className="w-full flex flex-col gap-3">
          <TextField label="아이디" type="text" value={id} onChange={setId} />
          <TextField label="비밀번호" type="password" value={password} onChange={setPassword} />
          {mode === "signup" && (
            <TextField
              label="비밀번호 확인"
              type="password"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
            />
          )}
        </div>

        <div className="w-full flex flex-col items-center gap-6">
          {mode === "login" ? (
            <>
              <Button label="로그인" variant="filled" onClick={handleLogin} className="w-full" />
              <button
                className="font-sans text-sm text-accent hover:text-primary-900 transition-colors"
                onClick={() => setMode("signup")}
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              <Button label="회원가입" variant="filled" onClick={handleSignup} className="w-full" />
              <button
                className="font-sans text-sm text-accent hover:text-primary-900 transition-colors"
                onClick={() => setMode("login")}
              >
                로그인
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
