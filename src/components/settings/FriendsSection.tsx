"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import CircleCheckbox from "@/components/common/CircleCheckbox";
import AddFriendModal from "@/components/common/AddFriendModal";
import { useFriendsList, useAddFriend, useDeleteFriends } from "@/hooks/useFriends";
import { useSnackbar } from "@/components/common/SnackbarProvider";

export default function FriendsSection() {
  const { friends, total, isLoading, refetch } = useFriendsList();
  const { addFriend, isLoading: isAdding } = useAddFriend();
  const { deleteFriends, isLoading: isDeleting } = useDeleteFriends();
  const { showSnackbar } = useSnackbar();
  const [selected, setSelected] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const toggleFriend = (loginId: string) => {
    setSelected((prev) =>
      prev.includes(loginId) ? prev.filter((id) => id !== loginId) : [...prev, loginId]
    );
  };

  const handleDelete = async () => {
    if (selected.length === 0) return;
    const { error } = await deleteFriends(selected);
    if (error) {
      showSnackbar(error.message);
      return;
    }
    setSelected([]);
    refetch();
  };

  const handleAddFriend = async (loginId: string) => {
    if (!loginId) return;
    const { error } = await addFriend(loginId);
    if (error) {
      showSnackbar(error.message);
      return;
    }
    showSnackbar("친구를 추가했어요.");
    setShowAddModal(false);
    refetch();
  };

  return (
    <section className="flex flex-col gap-4 p-8 rounded-[2rem] bg-[rgba(255,250,245,0.1)] border border-white/40 shadow-drop backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-point text-xl text-primary-800">친구</h2>
        <span className="font-point text-primary-900">{total}/10</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {!isLoading &&
          friends.map((friend) => (
            <CircleCheckbox
              key={friend.loginId}
              label={friend.loginId}
              checked={selected.includes(friend.loginId)}
              onChange={() => toggleFriend(friend.loginId)}
            />
          ))}
      </div>

      <div className="flex gap-3 mt-2">
        {selected.length === 0 ? (
          <Button
            label="친구 추가하기"
            variant="outlined"
            className="flex-1"
            onClick={() => setShowAddModal(true)}
          />
        ) : (
          <Button
            label="선택 취소"
            variant="outlined"
            className="flex-1"
            onClick={() => setSelected([])}
          />
        )}
        <Button
          label={`${selected.length}명 삭제하기`}
          variant="danger"
          className="flex-1"
          onClick={handleDelete}
          disabled={selected.length === 0 || isDeleting}
        />
      </div>

      {showAddModal && (
        <AddFriendModal
          isLoading={isAdding}
          onSubmit={handleAddFriend}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </section>
  );
}
