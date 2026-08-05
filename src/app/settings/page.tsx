"use client";

import { useRouter } from "next/navigation";
import { useLogout } from "@/hooks/useAuth";
import { useSnackbar } from "@/components/SnackbarProvider";
import AccountSection from "@/components/settings/AccountSection";
import FriendsSection from "@/components/settings/FriendsSection";
import InfoSection from "@/components/settings/InfoSection";

export default function SettingsPage() {
  const router = useRouter();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const { showSnackbar } = useSnackbar();

  const handleLogout = async () => {
    const { ok, error } = await logout();
    showSnackbar(ok ? "로그아웃 되었습니다." : error?.message ?? "로그아웃에 실패했어요.");
    router.push("/");
  };

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <AccountSection />
        <FriendsSection />
        <InfoSection />

        <button
          className="self-center font-point text-lg text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          로그아웃
        </button>
      </div>
    </main>
  );
}
