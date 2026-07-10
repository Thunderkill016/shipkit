import { describe, it, expect, vi } from "vitest";
import { getLogger } from "./index";

describe("Logger Port", () => {
  it("should create namespace loggers", () => {
    const logger = getLogger("test-ns");
    expect(logger).toBeDefined();
    expect(logger.info).toBeTypeOf("function");
    expect(logger.error).toBeTypeOf("function");
  });

  it("should cache namespace loggers", () => {
    const logger1 = getLogger("test-ns");
    const logger2 = getLogger("test-ns");
    expect(logger1).toBe(logger2);
  });

  it("should format logs correctly", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = getLogger("test-ns-format");
    
    // Simulate non-production console output
    logger.info("testing info message", { foo: "bar" });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
