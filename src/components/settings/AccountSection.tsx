"use client";

import TextField from "@/components/common/TextField";
import Button from "@/components/common/Button";
import { useAccountSettings } from "@/hooks/useAccountSettings";

export default function AccountSection() {
  const {
    loginId,
    loginIdMessage,
    loginIdError,
    canSaveLoginId,
    isLoadingMe,
    isCheckingLoginId,
    isSavingLoginId,
    handleLoginIdChange,
    handleCheckLoginId,
    handleSaveLoginId,

    currentPassword,
    setCurrentPassword,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    passwordMessage,
    passwordError,
    isSavingPassword,
    handleChangePassword,

    isLoggingOut,
    handleLogout,

    // 계정 삭제는 설정 페이지 하단(위험 구역)으로 이동 — 아래는 되돌릴 수 있게 남겨둠
    // isDeleting,
    // setIsDeleting,
    // deletePassword,
    // setDeletePassword,
    // deleteMessage,
    // isDeletingAccount,
    // cancelDelete,
    // handleConfirmDelete,
  } = useAccountSettings();

  return (
    <section className="flex flex-col gap-4 p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
      <h2 className="font-point text-xl text-primary-800">계정</h2>

      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <span className="shrink-0 font-point text-lg text-primary-900 sm:w-24">닉네임 수정</span>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <TextField label="아이디" value={loginId} onChange={handleLoginIdChange} />
            </div>
            <Button
              label="중복 확인"
              variant="filled"
              size="md"
              onClick={handleCheckLoginId}
              disabled={!loginId || isLoadingMe || isCheckingLoginId}
            />
            {canSaveLoginId && (
              <Button
                label="저장"
                variant="outlined"
                size="md"
                onClick={handleSaveLoginId}
                disabled={isSavingLoginId}
              />
            )}
          </div>
        </div>
        {loginIdMessage && (
          <span
            className={`pr-2 text-xs sm:pl-34 ${loginIdError ? "text-danger" : "text-primary-900"}`}
          >
            {loginIdMessage}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <span className="shrink-0 font-point text-lg text-primary-900 sm:w-24">비밀번호 변경</span>
            <div className="flex-1 min-w-0">
              <TextField
                label="현재 비밀번호"
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
            </div>
          </div>
          <div className="sm:pl-30">
            <TextField label="새 비밀번호" type="password" value={password} onChange={setPassword} />
          </div>
          <div className="sm:pl-30 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <TextField
                label="새 비밀번호 확인"
                type="password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
              />
            </div>
            <Button
              label="변경"
              variant="filled"
              size="md"
              onClick={handleChangePassword}
              disabled={!currentPassword || !password || !passwordConfirm || isSavingPassword}
            />
          </div>
        </div>
        {passwordMessage && (
          <span
            className={`pr-2 text-xs sm:pl-34 ${passwordError ? "text-danger" : "text-primary-900"}`}
          >
            {passwordMessage}
          </span>
        )}
      </div>

      {/* 로그아웃 — 원래 자리(계정 섹션 하단). 계정 삭제는 페이지 하단 위험 구역으로 분리됨 */}
      <div className="flex justify-end mt-2">
        <Button
          label="로그아웃"
          variant="outlined"
          onClick={handleLogout}
          disabled={isLoggingOut}
        />
      </div>
    </section>
  );
}
