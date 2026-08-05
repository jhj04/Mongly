"use client";

import TextField from "@/components/TextField";
import Button from "@/components/Button";
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

    isDeleting,
    setIsDeleting,
    deletePassword,
    setDeletePassword,
    deleteMessage,
    isDeletingAccount,
    cancelDelete,
    handleConfirmDelete,

    isLoggingOut,
    handleLogout,
  } = useAccountSettings();

  return (
    <section className="flex flex-col gap-4 p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
      <h2 className="font-point text-xl text-primary-800">계정</h2>

      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <span className="shrink-0 font-point text-lg text-primary-900 sm:w-24">아이디 수정</span>
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

      {!isDeleting ? (
        <div className="flex gap-3 mt-2">
          <Button
            label="계정 삭제하기"
            variant="danger"
            className="flex-1"
            onClick={() => setIsDeleting(true)}
          />
          <Button
            label="로그아웃"
            variant="outlined"
            className="flex-1"
            onClick={handleLogout}
            disabled={isLoggingOut}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          <TextField
            label="비밀번호 확인"
            type="password"
            value={deletePassword}
            onChange={setDeletePassword}
            helperText={deleteMessage || "계정을 삭제하면 유리병과 친구 관계가 모두 사라져요."}
            error={!!deleteMessage}
          />
          <div className="flex gap-3">
            <Button label="취소" variant="outlined" className="flex-1" onClick={cancelDelete} />
            <Button
              label="삭제 확인"
              variant="danger"
              className="flex-1"
              onClick={handleConfirmDelete}
              disabled={isDeletingAccount}
            />
          </div>
        </div>
      )}
    </section>
  );
}
