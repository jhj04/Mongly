"use client";

import type { JarLikedNotification } from "@/lib/api/notifications";
import { formatShortDate } from "@/lib/date";

interface LikeNotificationListProps {
  notifications: JarLikedNotification[];
}

export default function LikeNotificationList({ notifications }: LikeNotificationListProps) {
  if (notifications.length === 0) {
    return <p className="text-center text-sm text-primary-900/70">아직 받은 좋아요가 없어요</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {notifications.map((n) => (
        <div key={n.id} className="flex items-center gap-3">
          <span className="text-base text-primary-900">
            {n.actor.loginId}님이 {formatShortDate(n.target.recordDate)} 기록에 좋아요를 눌렀어요
          </span>
        </div>
      ))}
    </div>
  );
}
