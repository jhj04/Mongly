"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLogout, useMe } from "@/hooks/useAuth";
import {
  useCheckLoginId,
  useUpdateLoginId,
  useUpdatePassword,
  useDeleteAccount,
} from "@/hooks/useUser";
import { useSnackbar } from "@/components/SnackbarProvider";

// 설정 페이지 "계정" 섹션(아이디 수정/비밀번호 변경/계정 삭제/로그아웃)의
// 상태와 핸들러를 전부 모아서, 컴포넌트 쪽은 JSX 렌더링만 담당하게 분리함.
export function useAccountSettings() {
  const router = useRouter();
  const { user, isLoading: isLoadingMe } = useMe();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const { checkLoginId, isLoading: isCheckingLoginId } = useCheckLoginId();
  const { updateLoginId, isLoading: isSavingLoginId } = useUpdateLoginId();
  const { updatePassword, isLoading: isSavingPassword } = useUpdatePassword();
  const { deleteAccount, isLoading: isDeletingAccount } = useDeleteAccount();
  const { showSnackbar } = useSnackbar();

  const [loginId, setLoginId] = useState("");
  const [checkedLoginId, setCheckedLoginId] = useState<string | null>(null);
  const [loginIdMessage, setLoginIdMessage] = useState("");
  const [loginIdError, setLoginIdError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  useEffect(() => {
    if (user) setLoginId(user.loginId);
  }, [user]);

  const handleLogout = async () => {
    const { ok, error } = await logout();
    showSnackbar(ok ? "로그아웃 되었습니다." : error?.message ?? "로그아웃에 실패했어요.");
    router.push("/");
  };

  const handleLoginIdChange = (value: string) => {
    setLoginId(value);
    setCheckedLoginId(null);
    setLoginIdMessage("");
    setLoginIdError(false);
  };

  const handleCheckLoginId = async () => {
    if (!loginId) return;
    const { available, error } = await checkLoginId(loginId);
    if (error) {
      setCheckedLoginId(null);
      setLoginIdError(true);
      setLoginIdMessage(error.message);
      return;
    }
    setCheckedLoginId(loginId);
    setLoginIdError(!available);
    setLoginIdMessage(available ? "사용할 수 있는 아이디예요." : "이미 사용 중인 아이디예요.");
  };

  const canSaveLoginId = checkedLoginId === loginId && !loginIdError;

  const handleSaveLoginId = async () => {
    if (!canSaveLoginId) return;
    const { loginId: savedLoginId, error } = await updateLoginId({ loginId });
    if (error) {
      setLoginIdError(true);
      setLoginIdMessage(error.message);
      return;
    }
    if (savedLoginId) setLoginId(savedLoginId);
    setCheckedLoginId(null);
    setLoginIdMessage("아이디가 변경됐어요.");
    showSnackbar("아이디가 변경됐어요.");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !password) return;
    if (password !== passwordConfirm) {
      setPasswordError(true);
      setPasswordMessage("새 비밀번호가 일치하지 않아요.");
      return;
    }
    const { error } = await updatePassword({ currentPassword, newPassword: password });
    if (error) {
      setPasswordError(true);
      setPasswordMessage(error.message);
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setPasswordConfirm("");
    setPasswordError(false);
    setPasswordMessage("비밀번호가 변경됐어요.");
    showSnackbar("비밀번호가 변경됐어요.");
  };

  const cancelDelete = () => {
    setIsDeleting(false);
    setDeletePassword("");
    setDeleteMessage("");
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      setDeleteMessage("비밀번호를 입력해주세요.");
      return;
    }
    const { error } = await deleteAccount({ password: deletePassword });
    if (error) {
      setDeleteMessage(error.message);
      return;
    }
    showSnackbar("계정이 삭제됐어요.");
    router.push("/");
  };

  return {
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
  };
}
