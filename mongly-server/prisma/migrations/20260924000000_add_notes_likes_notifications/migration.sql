-- 기존 JarImage 등 이번 변경과 관계없는 테이블은 건드리지 않는다.
BEGIN;
ALTER TABLE "Jar" ADD COLUMN "note" TEXT,
                  ADD COLUMN "updatedAt" TIMESTAMP(3),
                  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
UPDATE "Jar" SET "updatedAt" = "createdAt";
ALTER TABLE "Jar" ALTER COLUMN "updatedAt" SET NOT NULL,
                  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST', 'JAR_LIKED');

CREATE TABLE "JarLike" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JarLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "jarLikeId" TEXT,
    "friendRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notification_type_target_check" CHECK (
      ("type" = 'JAR_LIKED' AND "jarLikeId" IS NOT NULL AND "friendRequestId" IS NULL)
      OR
      ("type" = 'FRIEND_REQUEST' AND "friendRequestId" IS NOT NULL AND "jarLikeId" IS NULL)
    )
);

CREATE UNIQUE INDEX "JarLike_jarId_userId_key" ON "JarLike"("jarId", "userId");
CREATE INDEX "JarLike_jarId_isActive_idx" ON "JarLike"("jarId", "isActive");
CREATE INDEX "JarLike_userId_jarId_idx" ON "JarLike"("userId", "jarId");
CREATE UNIQUE INDEX "Notification_jarLikeId_key" ON "Notification"("jarLikeId");
CREATE UNIQUE INDEX "Notification_friendRequestId_key" ON "Notification"("friendRequestId");
CREATE INDEX "Notification_recipientId_createdAt_id_idx" ON "Notification"("recipientId", "createdAt", "id");
CREATE INDEX "Notification_recipientId_type_createdAt_id_idx" ON "Notification"("recipientId", "type", "createdAt", "id");
CREATE INDEX "Notification_recipientId_readAt_idx" ON "Notification"("recipientId", "readAt");

ALTER TABLE "JarLike" ADD CONSTRAINT "JarLike_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JarLike" ADD CONSTRAINT "JarLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_jarLikeId_fkey" FOREIGN KEY ("jarLikeId") REFERENCES "JarLike"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_friendRequestId_fkey" FOREIGN KEY ("friendRequestId") REFERENCES "FriendRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 미처리 친구 요청을 통합 알림함에서도 바로 볼 수 있게 한다. 외부 확장/UUID 함수 불필요.
INSERT INTO "Notification" ("id", "recipientId", "type", "friendRequestId", "createdAt")
SELECT 'friend-request-' || "id", "toUserId", 'FRIEND_REQUEST', "id", "createdAt"
FROM "FriendRequest";

COMMIT;
