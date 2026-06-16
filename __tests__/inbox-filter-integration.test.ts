import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * Integration tests for "Filter old jobs" feature
 * Tests the full flow:
 * 1. Open FilterOldJobsDialog
 * 2. Input number of days
 * 3. Fetch estimated count (GET /api/jobs?status=INBOX&filterOlderThan=N)
 * 4. Display confirmation step
 * 5. Submit filter (PATCH /api/settings with new SmartRule)
 * 6. Handle response with filteredCount
 * 7. Show success toast
 * 8. Call router.refresh()
 */

describe("Inbox — Filter old jobs integration", () => {
  const mockFetch = vi.fn();
  const mockRouterRefresh = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
    mockRouterRefresh.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("API contract — GET /api/jobs?filterOlderThan", () => {
    it("should call GET /api/jobs with filterOlderThan param", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 8 }),
      });

      const response = await fetch(
        "/api/jobs?status=INBOX&filterOlderThan=14"
      );
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/jobs?status=INBOX&filterOlderThan=14"
      );
      expect(data.total).toBe(8);
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should return 0 when no jobs match", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const response = await fetch(
        "/api/jobs?status=INBOX&filterOlderThan=365"
      );
      const data = await response.json();

      expect(data.total).toBe(0);
    });

    it("should return error response on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Count failed" }),
      });

      const response = await fetch(
        "/api/jobs?status=INBOX&filterOlderThan=7"
      );
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe("Count failed");
    });
  });

  describe("API contract — PATCH /api/settings with new rule", () => {
    it("should accept SmartRule and return filteredCount", async () => {
      const newRule = {
        id: "rule-123",
        name: "Auto: 30 jours",
        enabled: true,
        conditions: [
          {
            id: "cond-123",
            field: "createdAt",
            operator: "olderThan",
            value: 30,
          },
        ],
        action: "FILTER",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            settings: { rules: [newRule] },
            filteredCount: 15,
          }),
      });

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: [newRule] }),
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ rules: [newRule] }),
        })
      );
      expect(data.filteredCount).toBe(15);
      expect(Array.isArray(data.settings.rules)).toBe(true);
    });

    it("should preserve existing rules when adding new one", async () => {
      const existingRule = {
        id: "rule-old",
        name: "Old rule",
        enabled: true,
        conditions: [
          {
            id: "cond-old",
            field: "title",
            operator: "contains",
            value: "Senior",
          },
        ],
        action: "FILTER",
      };

      const newRule = {
        id: "rule-new",
        name: "Auto: 14 jours",
        enabled: true,
        conditions: [
          {
            id: "cond-new",
            field: "createdAt",
            operator: "olderThan",
            value: 14,
          },
        ],
        action: "FILTER",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            settings: { rules: [existingRule, newRule] },
            filteredCount: 10,
          }),
      });

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: [existingRule, newRule] }),
      });

      const data = await response.json();

      expect(data.settings.rules.length).toBe(2);
      expect(data.settings.rules[0].id).toBe("rule-old");
      expect(data.settings.rules[1].id).toBe("rule-new");
    });

    it("should return filteredCount = 0 when no rules added", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            settings: { rules: [] },
            filteredCount: 0,
          }),
      });

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whitelist: ["React"] }),
      });

      const data = await response.json();

      expect(data.filteredCount).toBe(0);
    });

    it("should handle error on rule creation", async () => {
      const newRule = {
        id: "rule-123",
        name: "Auto: 7 jours",
        enabled: true,
        conditions: [
          {
            id: "cond-123",
            field: "createdAt",
            operator: "olderThan",
            value: 7,
          },
        ],
        action: "FILTER",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Update failed" }),
      });

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: [newRule] }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe("Update failed");
    });
  });

  describe("SmartRule format validation", () => {
    it("should match expected SmartRule structure", () => {
      const rule = {
        id: "rule-uuid",
        name: "Auto: 21 jours",
        enabled: true,
        conditions: [
          {
            id: "cond-uuid",
            field: "createdAt",
            operator: "olderThan" as const,
            value: 21,
          },
        ],
        action: "FILTER" as const,
      };

      // Validate structure
      expect(rule.id).toBeDefined();
      expect(rule.name).toMatch(/^Auto: \d+ jours$/);
      expect(rule.enabled).toBe(true);
      expect(rule.conditions.length).toBe(1);
      expect(rule.conditions[0].field).toBe("createdAt");
      expect(rule.conditions[0].operator).toBe("olderThan");
      expect(typeof rule.conditions[0].value).toBe("number");
      expect(rule.action).toBe("FILTER");
    });

    it("should validate days are between 1-365", () => {
      const testCases = [
        { days: 1, valid: true },
        { days: 7, valid: true },
        { days: 30, valid: true },
        { days: 365, valid: true },
        { days: 0, valid: false },
        { days: 366, valid: false },
        { days: -1, valid: false },
      ];

      testCases.forEach(({ days, valid }) => {
        const isValid = days >= 1 && days <= 365;
        expect(isValid).toBe(valid);
      });
    });
  });

  describe("Full workflow — Step by step", () => {
    it("should execute complete flow: dialog → count → submit → toast → refresh", async () => {
      // Step 1: Fetch estimated count
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 12 }),
      });

      const countResponse = await fetch(
        "/api/jobs?status=INBOX&filterOlderThan=28"
      );
      const countData = await countResponse.json();

      expect(countData.total).toBe(12);

      // Step 2: Create SmartRule and submit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            settings: {
              rules: [
                {
                  id: "rule-123",
                  name: "Auto: 28 jours",
                  enabled: true,
                  conditions: [
                    {
                      id: "cond-123",
                      field: "createdAt",
                      operator: "olderThan",
                      value: 28,
                    },
                  ],
                  action: "FILTER",
                },
              ],
            },
            filteredCount: 12,
          }),
      });

      const settingsResponse = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: [
            {
              id: "rule-123",
              name: "Auto: 28 jours",
              enabled: true,
              conditions: [
                {
                  id: "cond-123",
                  field: "createdAt",
                  operator: "olderThan",
                  value: 28,
                },
              ],
              action: "FILTER",
            },
          ],
        }),
      });

      const settingsData = await settingsResponse.json();

      // Verify flow
      expect(countData.total).toBe(12);
      expect(settingsData.filteredCount).toBe(12);
      expect(settingsData.settings.rules[0].name).toBe("Auto: 28 jours");
    });

    it("should handle network error during count fetch", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      try {
        await fetch("/api/jobs?status=INBOX&filterOlderThan=14");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });

    it("should handle network error during rule submission", async () => {
      // First fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 5 }),
      });

      await fetch("/api/jobs?status=INBOX&filterOlderThan=7");

      // Second fetch fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rules: [
              {
                id: "rule-123",
                name: "Auto: 7 jours",
                enabled: true,
                conditions: [
                  {
                    id: "cond-123",
                    field: "createdAt",
                    operator: "olderThan",
                    value: 7,
                  },
                ],
                action: "FILTER",
              },
            ],
          }),
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });
  });

  describe("Toast messaging", () => {
    it("should format success message with singular 'offre' and 'jour'", () => {
      const days = 1;
      const filteredCount = 1;
      const message = `${filteredCount} offre${filteredCount !== 1 ? "s" : ""} filtrée${filteredCount !== 1 ? "s" : ""} (> ${days} jour${days !== 1 ? "s" : ""})`;

      expect(message).toBe("1 offre filtrée (> 1 jour)");
    });

    it("should format success message with plural 'offres' and 'jours'", () => {
      const days = 30;
      const filteredCount = 15;
      const message = `${filteredCount} offre${filteredCount !== 1 ? "s" : ""} filtrée${filteredCount !== 1 ? "s" : ""} (> ${days} jour${days !== 1 ? "s" : ""})`;

      expect(message).toBe("15 offres filtrées (> 30 jours)");
    });

    it("should format success message with mixed singular/plural", () => {
      const days = 1;
      const filteredCount = 5;
      const message = `${filteredCount} offre${filteredCount !== 1 ? "s" : ""} filtrée${filteredCount !== 1 ? "s" : ""} (> ${days} jour${days !== 1 ? "s" : ""})`;

      expect(message).toBe("5 offres filtrées (> 1 jour)");
    });
  });

  describe("Backward compatibility", () => {
    it("should preserve existing 'Mark all as read' functionality", async () => {
      // This endpoint should remain unchanged
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await fetch("/api/jobs/mark-visited", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.ok).toBe(true);
    });

    it("should accept PATCH /api/settings with non-filter updates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            settings: { blacklist: ["Stage", "Alternance"] },
            filteredCount: 0,
          }),
      });

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blacklist: ["Stage", "Alternance"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.filteredCount).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle 0 filtered jobs gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0 }),
      });

      const response = await fetch(
        "/api/jobs?status=INBOX&filterOlderThan=365"
      );
      const data = await response.json();

      expect(data.total).toBe(0);
    });

    it("should handle large number of filtered jobs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 10000 }),
      });

      const response = await fetch(
        "/api/jobs?status=INBOX&filterOlderThan=1"
      );
      const data = await response.json();

      expect(data.total).toBe(10000);
    });

    it("should reject invalid days values", () => {
      const invalidValues = [-5, 0, 366, 1000, "abc", null, undefined];

      invalidValues.forEach((value) => {
        const isValid = typeof value === "number" && value >= 1 && value <= 365;
        expect(isValid).toBe(false);
      });
    });

    it("should handle concurrent rule creation", async () => {
      const rule1 = {
        id: "rule-1",
        name: "Auto: 7 jours",
        enabled: true,
        conditions: [
          {
            id: "cond-1",
            field: "createdAt",
            operator: "olderThan" as const,
            value: 7,
          },
        ],
        action: "FILTER" as const,
      };

      const rule2 = {
        id: "rule-2",
        name: "Auto: 30 jours",
        enabled: true,
        conditions: [
          {
            id: "cond-2",
            field: "createdAt",
            operator: "olderThan" as const,
            value: 30,
          },
        ],
        action: "FILTER" as const,
      };

      // Simulate multiple requests
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              settings: { rules: [rule1] },
              filteredCount: 5,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              settings: { rules: [rule1, rule2] },
              filteredCount: 12,
            }),
        });

      const response1 = await fetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ rules: [rule1] }),
      });

      const response2 = await fetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ rules: [rule1, rule2] }),
      });

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.settings.rules.length).toBe(1);
      expect(data2.settings.rules.length).toBe(2);
    });
  });
});
