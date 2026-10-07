"use client";

import Button from "./Button";
import type { FriendRequestItem } from "@/lib/api/friends";

interface FriendRequestListProps {
  requests: FriendRequestItem[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export default function FriendRequestList({ requests, onAccept, onReject }: FriendRequestListProps) {
  if (requests.length === 0) {
    return <p className="text-center text-sm text-primary-900/70">받은 요청이 없어요</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {requests.map((request) => (
        <div key={request.id} className="flex items-center justify-between gap-3">
          <span className="truncate text-base text-primary-900">{request.fromLoginId}</span>
          <div className="flex flex-shrink-0 gap-2">
            <Button label="확인" variant="filled" size="sm" onClick={() => onAccept(request.id)} />
            <Button label="삭제" variant="outlined" size="sm" onClick={() => onReject(request.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
