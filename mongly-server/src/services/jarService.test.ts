import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), lock: vi.fn(), findUser: vi.fn(), findJar: vi.fn(), updateJar: vi.fn(),
  findEmotions: vi.fn(), deleteEmotions: vi.fn(), createEmotions: vi.fn(), summarize: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("../lib/locks", () => ({ lockUsers: mocks.lock }));
vi.mock("../repositories/likeRepository", () => ({ likeRepository: { summarize: mocks.summarize } }));

import { jarService } from "./jarService";
import { JarWithEmotions } from "../repositories/jarRepository";

const tx = {
  user: { findUnique: mocks.findUser },
  jar: { findUnique: mocks.findJar, updateMany: mocks.updateJar },
  emotion: { findMany: mocks.findEmotions },
  jarEmotion: { deleteMany: mocks.deleteEmotions, createMany: mocks.createEmotions },
};

let current: JarWithEmotions;

beforeEach(() => {
  vi.resetAllMocks();
  // Date만 대체해 JWT/HTTP/network 타이머와 무관한 도메인 날짜 경계를 검사한다.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-24T14:59:59.000Z"));
  current = {
    id: "jar", userId: "owner", note: "원래 일기", version: 1,
    recordDate: new Date("2026-09-24T00:00:00.000Z"),
    createdAt: new Date("2026-09-24T10:00:00.000Z"),
    updatedAt: new Date("2026-09-24T10:00:00.000Z"),
    emotions: [{ jarId: "jar", emotionId: 1, count: 1, emotion: { name: "기쁨", colorHex: "#FFD54A" } }],
  };
  mocks.transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  mocks.lock.mockResolvedValue(undefined);
  mocks.findUser.mockResolvedValue({ id: "owner" });
  mocks.findJar.mockImplementation(async () => current);
  mocks.summarize.mockResolvedValue(new Map());
  mocks.updateJar.mockImplementation(async ({ data }: { data: { note: string | null; updatedAt: Date } }) => {
    current = { ...current, note: data.note, updatedAt: data.updatedAt, version: current.version + 1 };
    return { count: 1 };
  });
});

afterEach(() => vi.useRealTimers());

describe("완성본 수정 — KST 날짜 판정과 optimistic version", () => {
  it("KST 23:59:59에는 수정 가능하며 ID·날짜·생성시각은 보존", async () => {
    const response = await jarService.updateJar("owner", "jar", { expectedVersion: 1, note: "새 일기" });
    expect(response).toMatchObject({
      id: "jar", recordDate: "2026-09-24", createdAt: "2026-09-24T10:00:00.000Z",
      note: "새 일기", version: 2, canEdit: true,
    });
    expect(mocks.updateJar).toHaveBeenCalledWith({
      where: { id: "jar", userId: "owner", version: 1 },
      data: { note: "새 일기", version: { increment: 1 }, updatedAt: new Date("2026-09-24T14:59:59.000Z") },
    });
    expect(mocks.findEmotions).not.toHaveBeenCalled();
    expect(mocks.deleteEmotions).not.toHaveBeenCalled();
  });

  it("KST 00:00:00에는 전날 병 수정을 거부", async () => {
    vi.setSystemTime(new Date("2026-09-24T15:00:00.000Z"));
    await expect(jarService.updateJar("owner", "jar", { expectedVersion: 1, note: null }))
      .rejects.toMatchObject({ status: 409, code: "JAR_EDIT_WINDOW_CLOSED" });
    expect(mocks.updateJar).not.toHaveBeenCalled();
  });

  it("요청 도착 때는 오늘이어도 사용자 잠금 대기 중 자정을 넘기면 거부", async () => {
    mocks.lock.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date("2026-09-24T15:00:00.000Z"));
    });
    await expect(jarService.updateJar("owner", "jar", { expectedVersion: 1, note: null }))
      .rejects.toMatchObject({ code: "JAR_EDIT_WINDOW_CLOSED" });
    expect(mocks.updateJar).not.toHaveBeenCalled();
  });

  it("판정 후 저장이 자정을 넘으면 판정한 날짜로 완료하고 응답 canEdit은 현재 시각 기준", async () => {
    mocks.updateJar.mockImplementationOnce(async ({ data }: { data: { note: string | null; updatedAt: Date } }) => {
      vi.setSystemTime(new Date("2026-09-24T15:00:00.000Z"));
      current = { ...current, note: data.note, updatedAt: data.updatedAt, version: 2 };
      return { count: 1 };
    });
    const response = await jarService.updateJar("owner", "jar", { expectedVersion: 1, note: "수정" });
    expect(response).toMatchObject({ note: "수정", version: 2, recordDate: "2026-09-24", canEdit: false });
  });

  it("정상 no-op은 버전·시각을 변경하지 않음", async () => {
    const response = await jarService.updateJar("owner", "jar", { expectedVersion: 1, note: current.note });
    expect(response).toMatchObject({ version: 1, updatedAt: "2026-09-24T10:00:00.000Z" });
    expect(mocks.updateJar).not.toHaveBeenCalled();
  });

  it("내용이 같아도 stale version은 no-op 처리하지 않고 충돌", async () => {
    current.version = 2;
    await expect(jarService.updateJar("owner", "jar", { expectedVersion: 1, note: current.note }))
      .rejects.toMatchObject({ code: "JAR_VERSION_CONFLICT", details: { currentVersion: 2 } });
    expect(mocks.updateJar).not.toHaveBeenCalled();
  });

  it("실제 조건부 UPDATE가 실패하면 자식 감정을 지우지 않는다", async () => {
    mocks.findEmotions.mockResolvedValue([{ id: 2, isActive: true }]);
    mocks.updateJar.mockImplementationOnce(async () => {
      current.version = 2;
      return { count: 0 };
    });
    await expect(jarService.updateJar("owner", "jar", { expectedVersion: 1, emotions: [{ emotionId: 2, count: 1 }] }))
      .rejects.toMatchObject({ code: "JAR_VERSION_CONFLICT", details: { currentVersion: 2 } });
    expect(mocks.deleteEmotions).not.toHaveBeenCalled();
    expect(mocks.createEmotions).not.toHaveBeenCalled();
  });
});
