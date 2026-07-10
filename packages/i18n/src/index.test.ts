import { describe, it, expect } from "vitest";
import { createDictionary, detectLocale } from "./index";

const dicts = {
  vi: {
    auth: {
      signIn: "Đăng nhập",
    },
    common: {
      error: "Lỗi",
    },
  },
  en: {
    auth: {
      signIn: "Sign in",
    },
    common: {
      error: "Error",
    },
  },
};

describe("i18n Port", () => {
  it("should select correct locale translations", () => {
    const tVi = createDictionary("vi", dicts);
    const tEn = createDictionary("en", dicts);

    expect(tVi("auth.signIn")).toBe("Đăng nhập");
    expect(tEn("auth.signIn")).toBe("Sign in");
  });

  it("should support falling back to key when missing", () => {
    const t = createDictionary("vi", dicts);
    expect(t("missing.key")).toBe("missing.key");
    expect(t("missing.key", "Fallback")).toBe("Fallback");
  });

  it("should support deep key traversal", () => {
    const t = createDictionary("en", dicts);
    expect(t("common.error")).toBe("Error");
  });

  it("should detect locales from headers correctly", () => {
    expect(detectLocale("vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("vi");
    expect(detectLocale("en-US,en;q=0.9")).toBe("en");
    expect(detectLocale(null)).toBe("en");
    expect(detectLocale("")).toBe("en");
  });
});
