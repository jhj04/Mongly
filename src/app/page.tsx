"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import { useLogin, useSignup } from "@/hooks/useAuth";
import { useSnackbar } from "@/components/SnackbarProvider";

type Mode = "login" | "signup";

const REMEMBERED_EMAIL_KEY = "mongly:rememberedEmail";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const { login, isLoading } = useLogin();
  const { signup, isLoading: isSigningUp } = useSignup();
  const { showSnackbar } = useSnackbar();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) {
      // localStorage(외부 시스템)에서 마운트 시 1회 값을 읽어와 동기화하는 용도라 의도된 패턴
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  const handleLogin = async () => {
    const { user, error } = await login({ email, password });
    if (user) {
      if (rememberEmail) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      showSnackbar("로그인 되었습니다.");
      router.push("/home");
    } else if (error) {
      showSnackbar(error.message);
    }
  };

  const handleSignup = async () => {
    if (password !== passwordConfirm) {
      showSnackbar("비밀번호가 일치하지 않아요.");
      return;
    }
    if (!agreedToTerms) {
      showSnackbar("약관에 동의해주세요.");
      return;
    }

    const { user, error } = await signup({
      email,
      loginId: nickname,
      password,
      termsAgreed: agreedToTerms,
    });
    if (user) {
      showSnackbar("회원가입이 완료되었습니다.");
      router.push("/home");
    } else if (error) {
      showSnackbar(error.message);
    }
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
        <h1 className="font-point text-5xl text-primary-800">
          {mode === "login" ? "몽글리" : "회원가입"}
        </h1>

        <div className="w-full flex flex-col gap-3">
          <TextField label="이메일" type="text" value={email} onChange={setEmail} />
          <TextField label="비밀번호" type="password" value={password} onChange={setPassword} />
          {mode === "signup" && (
            <>
              <TextField
                label="비밀번호 확인"
                type="password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
              />
              <TextField label="닉네임" type="text" value={nickname} onChange={setNickname} />
            </>
          )}
          {mode === "login" && (
            <div className="flex items-center justify-between px-1">
              <Checkbox label="이메일 기억하기" checked={rememberEmail} onChange={setRememberEmail} />
              <button
                type="button"
                className="font-sans text-[15px] font-regular text-black/25 hover:text-primary-900 transition-colors"
                onClick={() => {}}
              >
                비밀번호 찾기
              </button>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-center gap-6">
          {mode === "login" ? (
            <>
              <Button
                label={isLoading ? "로그인 중..." : "로그인하기"}
                variant="filled"
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full !font-sans !text-sm !py-4"
              />
              <button
                className="font-sans text-sm text-accent hover:text-primary-900 transition-colors"
                onClick={() => setMode("signup")}
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              <Button
                label={isSigningUp ? "가입 중..." : "회원가입"}
                variant="filled"
                onClick={handleSignup}
                disabled={isSigningUp}
                className="w-full !font-sans !text-sm !py-4"
              />
              <Checkbox
                label="이용약관에 동의합니다"
                checked={agreedToTerms}
                onChange={setAgreedToTerms}
              />
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
