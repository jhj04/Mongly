-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "DraftEmotion" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "emotionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftEmotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftEmotion_userId_recordDate_idx" ON "DraftEmotion"("userId", "recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "DraftEmotion" ADD CONSTRAINT "DraftEmotion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftEmotion" ADD CONSTRAINT "DraftEmotion_emotionId_fkey" FOREIGN KEY ("emotionId") REFERENCES "Emotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

