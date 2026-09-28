import { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "./errorHandler";

describe("private diary error logging", () => {
  it("does not put database query arguments into logs or the response", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    try {
      const failure = Object.assign(new Error('INSERT note="매우 개인적인 일기"'), { code: "P2003" });
      errorHandler(failure, {} as Request, { status } as unknown as Response, vi.fn() as NextFunction);
      expect(status).toHaveBeenCalledWith(500);
      expect(log).toHaveBeenCalledWith("Unhandled server error", { name: "Error", code: "P2003" });
      expect(JSON.stringify([log.mock.calls, json.mock.calls])).not.toContain("개인적인 일기");
    } finally {
      log.mockRestore();
    }
  });
});
