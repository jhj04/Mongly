"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleteAccount } from "@/hooks/useUser";
import { useSnackbar } from "@/components/common/SnackbarProvider";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import AccountSection from "@/components/settings/AccountSection";
import FriendsSection from "@/components/settings/FriendsSection";
import InfoSection from "@/components/settings/InfoSection";

export default function SettingsPage() {
  const router = useRouter();
  const { deleteAccount, isLoading: isDeletingAccount } = useDeleteAccount();
  const { showSnackbar } = useSnackbar();

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

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

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <AccountSection />
        <FriendsSection />
        <InfoSection />

        {/* 하단 위험 구역 — 계정 삭제(되돌릴 수 없는 동작)만 분리. 로그아웃은 계정 섹션 하단에 있음 */}
        <div className="mt-4 flex flex-col items-center gap-6">
          <div className="w-full flex flex-col items-center gap-3 border-t border-white/25 pt-6">
            {!isDeleting ? (
              <button
                type="button"
                className="font-point text-lg text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
                onClick={() => setIsDeleting(true)}
              >
                계정 삭제하기
              </button>
            ) : (
              <div className="w-full max-w-sm flex flex-col gap-2">
                <TextField
                  label="비밀번호 확인"
                  type="password"
                  value={deletePassword}
                  onChange={setDeletePassword}
                  helperText={deleteMessage || "계정을 삭제하면 유리병과 친구 관계가 모두 사라져요."}
                  error={!!deleteMessage}
                />
                <div className="flex gap-3">
                  <Button
                    label="취소"
                    variant="outlined"
                    className="flex-1"
                    onClick={cancelDelete}
                  />
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
          </div>
        </div>
      </div>
    </main>
  );
}
