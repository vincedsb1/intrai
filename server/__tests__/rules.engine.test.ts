import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { evaluateRule } from "@/server/rules.engine";
import { Job, SmartRule } from "@/lib/types";

describe("rules.engine — createdAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("olderThan operator", () => {
    it("should match jobs older than threshold", () => {
      const job: Partial<Job> = {
        createdAt: new Date("2026-06-09"), // 7 days ago
      };
      const rule: SmartRule = {
        id: "rule1",
        name: "Anti-Oldies",
        enabled: true,
        conditions: [
          {
            id: "cond1",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
        ],
        action: "FILTER",
      };
      expect(evaluateRule(job, rule)).toBe(true);
    });

    it("should not match jobs newer than threshold", () => {
      const job: Partial<Job> = {
        createdAt: new Date("2026-06-12"), // 4 days ago
      };
      const rule: SmartRule = {
        id: "rule1",
        name: "Anti-Oldies",
        enabled: true,
        conditions: [
          {
            id: "cond1",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
        ],
        action: "FILTER",
      };
      expect(evaluateRule(job, rule)).toBe(false);
    });

    it("should match jobs at exact threshold (inclusive)", () => {
      const job: Partial<Job> = {
        createdAt: new Date("2026-06-09"), // exactly 7 days ago
      };
      const rule: SmartRule = {
        id: "rule1",
        name: "Anti-Oldies",
        enabled: true,
        conditions: [
          {
            id: "cond1",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
        ],
        action: "FILTER",
      };
      expect(evaluateRule(job, rule)).toBe(true);
    });

    it("should not match if createdAt is null", () => {
      const job: Partial<Job> = {
        createdAt: null as any,
      };
      const rule: SmartRule = {
        id: "rule1",
        name: "Anti-Oldies",
        enabled: true,
        conditions: [
          {
            id: "cond1",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
        ],
        action: "FILTER",
      };
      expect(evaluateRule(job, rule)).toBe(false);
    });

    it("should combine createdAt with other string conditions (AND logic)", () => {
      const job: Partial<Job> = {
        title: "Senior Designer",
        createdAt: new Date("2026-06-09"), // 7 days old
      };
      const rule: SmartRule = {
        id: "rule1",
        name: "Anti-Old-Designers",
        enabled: true,
        conditions: [
          {
            id: "cond1",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
          {
            id: "cond2",
            field: "title",
            operator: "contains",
            value: "Designer",
          },
        ],
        action: "FILTER",
      };
      expect(evaluateRule(job, rule)).toBe(true);
    });

    it("should fail combined rule if one condition fails", () => {
      const job: Partial<Job> = {
        title: "Senior Engineer",
        createdAt: new Date("2026-06-09"), // 7 days old
      };
      const rule: SmartRule = {
        id: "rule1",
        name: "Anti-Old-Designers",
        enabled: true,
        conditions: [
          {
            id: "cond1",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
          {
            id: "cond2",
            field: "title",
            operator: "contains",
            value: "Designer",
          },
        ],
        action: "FILTER",
      };
      expect(evaluateRule(job, rule)).toBe(false);
    });
  });

  describe("disabled rules", () => {
    it("should not match disabled rules", () => {
      const job: Partial<Job> = {
        createdAt: new Date("2026-06-09"),
      };
      const rule: SmartRule = {
        id: "rule1",
        name: "Anti-Oldies",
        enabled: false,
        conditions: [
          {
            id: "cond1",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
        ],
        action: "FILTER",
      };
      expect(evaluateRule(job, rule)).toBe(false);
    });
  });
});
